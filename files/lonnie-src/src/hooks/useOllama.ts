import { useState, useEffect, useCallback, useRef } from "react";
import {
  aiClient, OPENROUTER_FREE_MODELS, type AIModel, type ChatMessage, type BackendType
} from "@/integrations/ollama/client";
import {
  executeTool, executeAgentTool, parseToolCall, inferFallbackTool, detectFakeExecution, sanitizeResponse,
  TOOL_REGISTRY, AGENT_TOOL_REGISTRY, type ToolName, type ImageResult
} from "@/services/tools";
import { buildDynamicSystemPrompt } from "@/data/persona";
import { agent } from "@/lib/localAgent";
import { voice } from "@/lib/voice";
import { gef } from "@/lib/gef";
import { vault } from "@/lib/identityVault";
import { skills } from "@/lib/skills";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  timestamp: Date;
  toolName?: ToolName;
  toolArgs?: Record<string, unknown>;
  isStreaming?: boolean;
  tokens?: number;
  imageBase64?: string;
  imageResult?: ImageResult;
}

export interface ConnectionState {
  status: "idle" | "checking" | "connected" | "disconnected";
  latencyMs?: number;
  version?: string;
  backend?: BackendType;
  error?: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const STORAGE_KEY = "lonnie_v2_settings";

interface Settings {
  model: string; backend: BackendType; ollamaUrl: string;
  openrouterKey: string; enabledTools: ToolName[];
  temperature: number; voiceEnabled: boolean; ttsEnabled: boolean;
}

function load(): Partial<Settings> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function save(s: Partial<Settings>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), ...s })); } catch {}
}

const BROKEN = ["cogito","wormgpt","blackgrg","retired","deprecated","671b"];
const isBroken = (m: string) => BROKEN.some(b => m.toLowerCase().includes(b));
const ACTION_HINT_RE = /\b(read|inspect|check|search|list|clone|download|run|write|create|open|fetch|get|compare|analyze|summarize|view|status|pull|build|push|test|monitor|connect|install|update|github|repo|docker|file|folder|terminal|shell|curl|system|process|clipboard)\b/i;
const needsExecutionHint = (text: string) => ACTION_HINT_RE.test(text);

// Intervention when model fakes execution
const FORCE_EXECUTION = `WRONG. You described tool calls instead of making them.
Output ONLY a real JSON tool call block right now. No description. No narration. Just the JSON block.

\`\`\`json
{
  "tool": "fetch_image",
  "args": { "query": "your actual search query here" }
}
\`\`\`

Execute. Now.`;

export function useOllama() {
  const saved = load();

  const [connection, setConnection]            = useState<ConnectionState>({ status: "idle" });
  const [models, setModels]                    = useState<AIModel[]>(OPENROUTER_FREE_MODELS);
  const [backend, setBackendState]             = useState<BackendType>(saved.backend ?? "openrouter");
  const [selectedModel, setSelectedModelState] = useState<string>(saved.model ?? OPENROUTER_FREE_MODELS[0].id);
  const [ollamaUrl, setOllamaUrlState]         = useState(saved.ollamaUrl ?? "http://localhost:11434");
  const [openrouterKey, setOpenrouterKeyState] = useState(saved.openrouterKey ?? import.meta.env.VITE_OPENROUTER_API_KEY ?? "");
  const [enabledTools, setEnabledToolsState]   = useState<ToolName[]>(
    saved.enabledTools ?? TOOL_REGISTRY.filter(t => t.enabledByDefault).map(t => t.name)
  );
  const [temperature, setTemperatureState]     = useState(saved.temperature ?? 0.7);
  const [voiceEnabled, setVoiceEnabledState]   = useState(saved.voiceEnabled ?? false);
  const [ttsEnabled, setTtsEnabledState]       = useState(saved.ttsEnabled ?? false);
  const [messages, setMessages]                = useState<Message[]>([]);
  const [isGenerating, setIsGenerating]        = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Setters ───────────────────────────────────────────────────────────────
  const setBackend = useCallback((b: BackendType) => {
    setBackendState(b); aiClient.setBackend(b); save({ backend: b });
    const def = b === "openrouter" ? OPENROUTER_FREE_MODELS[0].id : "llama3.2";
    setSelectedModelState(def); aiClient.setSelectedModel(def); save({ model: def });
  }, []);
  const setSelectedModel = useCallback((m: string) => {
    setSelectedModelState(m); aiClient.setSelectedModel(m); save({ model: m });
  }, []);
  const setOllamaUrl = useCallback((u: string) => {
    setOllamaUrlState(u); aiClient.setOllamaUrl(u); save({ ollamaUrl: u });
  }, []);
  const setOpenrouterKey = useCallback((k: string) => {
    setOpenrouterKeyState(k); aiClient.setOpenRouterKey(k); save({ openrouterKey: k });
  }, []);
  const setEnabledTools = useCallback((fn: ToolName[] | ((p: ToolName[]) => ToolName[])) => {
    setEnabledToolsState(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save({ enabledTools: next }); return next;
    });
  }, []);
  const setTemperature  = useCallback((t: number) => { setTemperatureState(t); save({ temperature: t }); }, []);
  const toggleVoice     = useCallback(() => setVoiceEnabledState(v => { save({ voiceEnabled: !v }); return !v; }), []);
  const toggleTTS       = useCallback(() => setTtsEnabledState(t => { save({ ttsEnabled: !t }); return !t; }), []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    aiClient.setBackend(saved.backend ?? "openrouter");
    aiClient.setOllamaUrl(saved.ollamaUrl ?? "http://localhost:11434");
    aiClient.setOpenRouterKey(saved.openrouterKey ?? import.meta.env.VITE_OPENROUTER_API_KEY ?? "");
    aiClient.setSelectedModel(saved.model ?? OPENROUTER_FREE_MODELS[0].id);
    gef.loadFromMemory();
    vault.load();
    skills.load();
  }, []); // eslint-disable-line

  // ── Connection ────────────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    setConnection(c => ({ ...c, status: "checking" }));
    const result = await aiClient.ping();
    if (result.ok) {
      setConnection({ status: "connected", latencyMs: result.latencyMs, version: result.version, backend: result.backend });
      const list = await aiClient.listModels();
      setModels(list);
      setSelectedModelState(prev => {
        if (!isBroken(prev) && list.find(m => m.id === prev)) return prev;
        const next = list[0]?.id ?? OPENROUTER_FREE_MODELS[0].id;
        aiClient.setSelectedModel(next); save({ model: next }); return next;
      });
    } else {
      setConnection({ status: "disconnected", backend: result.backend, error: result.error });
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    checkConnection();
    const t = setInterval(checkConnection, 45_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // ── Core send ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    if ((!content.trim() && !imageBase64) || isGenerating) return;

    // Create GEF goal for substantial requests
    if (content.length > 30 && !content.match(/^(hi|hello|hey|thanks|ok|yes|no|what|who)\b/i)) {
      gef.createGoal(content).catch(() => {});
    }

    const userMsg: Message = { id: uid(), role: "user", content, timestamp: new Date(), imageBase64 };
    const assistantId = uid();

    setMessages(prev => [
      ...prev, userMsg,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
    ]);
    setIsGenerating(true);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // Build message history for API call
    const buildHistory = async (msgs: Message[]): Promise<ChatMessage[]> => {
      const systemPrompt = await buildDynamicSystemPrompt(enabledTools);
      const hist: ChatMessage[] = [{ role: "system", content: systemPrompt }];
      for (const m of msgs) {
        if (m.role === "user" && needsExecutionHint(m.content)) {
          hist.push({ role: "system", content: "Operational task. Execute with the best available tool now. Prefer the local desktop agent for shell, GitHub, Docker, filesystem, and remote access. Do not stop at a plan." });
        }
        if (m.role === "user") {
          hist.push({ role: "system", content: "Stay on the current task. Do not refer to the user as Lonnie; address them as 'you' or 'the operator'. Be proactive, concise, and evidence-based." });
          if (m.imageBase64) {
            hist.push({ role: "user", content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${m.imageBase64}` } },
              { type: "text", text: m.content || "What do you see in this image?" },
            ]});
          } else {
            hist.push({ role: "user", content: m.content });
          }
        } else if (m.role === "assistant" && m.content) {
          hist.push({ role: "assistant", content: m.content });
        } else if (m.role === "tool") {
          const rs = m.imageResult
            ? `Image displayed inline: "${m.imageResult.query}" (source: ${m.imageResult.source})`
            : m.content;
          hist.push({ role: "user", content: `TOOL RESULT [${m.toolName}]: ${rs}` });
        }
      }
      return hist;
    };

    try {
      const snapshot = await new Promise<Message[]>(r => setMessages(p => { r(p); return p; }));
      const history = await buildHistory(snapshot.filter(m => m.id !== assistantId));

      let fullText = "";
      let tokens: number | undefined;
      const initialTemperature = needsExecutionHint(content) ? 0.15 : temperature;

      // Stream first response
      for await (const delta of aiClient.streamChat(history, selectedModel, { temperature: initialTemperature }, signal)) {
        fullText += delta.text;
        if (delta.completionTokens) tokens = delta.completionTokens;
        const display1 = sanitizeResponse(fullText);
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: display1, tokens } : m
        ));
        if (parseToolCall(fullText)) break;
      }

      if (forcedTool) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Executing requested action…", isStreaming: true } : m));
      }

      if (!forcedTool && detectFakeExecution(fullText) && !parseToolCall(fullText)) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: "Correcting — executing for real…", isStreaming: true }
            : m
        ));

        const interventionHistory: ChatMessage[] = [
          ...history,
          { role: "assistant", content: fullText },
          { role: "user", content: FORCE_EXECUTION },
        ];

        fullText = "";
        for await (const delta of aiClient.streamChat(
          interventionHistory, selectedModel, { temperature: 0 }, signal
        )) {
          fullText += delta.text;
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: fullText } : m
          ));
          if (parseToolCall(fullText)) break;
        }
      }

      // ── Tool call chain — up to 10 steps ─────────────────────────────────
      let toolCall = parseToolCall(fullText) ?? (forcedTool ? { tool: forcedTool.tool, args: forcedTool.args } : null);
      let steps = 0;

      while (toolCall && steps < 10 && !signal.aborted) {
        // Mark assistant message done (showing tool call)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: fullText, isStreaming: false, toolName: toolCall!.tool, toolArgs: toolCall!.args }
            : m
        ));

        // Show tool running
        const toolMsgId = uid();
        setMessages(prev => [...prev, {
          id: toolMsgId, role: "tool" as const,
          content: "⏳ Running...",
          toolName: toolCall!.tool, toolArgs: toolCall!.args,
          timestamp: new Date(),
        }]);

        if (toolCall!.tool.startsWith("agent_")) {
          try { await agent.ping(); } catch {}
        }

        // Execute the actual tool
        let toolResult: string;
        let imageResult: ImageResult | undefined;
        try {
          const isAgentTool = toolCall.tool.startsWith("agent_");
          const raw = isAgentTool
            ? await executeAgentTool(toolCall.tool, toolCall.args)
            : await executeTool(toolCall.tool, toolCall.args);
          if (raw && typeof raw === "object" && (raw as ImageResult).type === "image") {
            imageResult = raw as ImageResult;
            toolResult = `Image retrieved and displayed: "${imageResult.query}" via ${imageResult.source}`;
          } else {
            toolResult = raw as string;
          }
        } catch (e: any) {
          toolResult = `Tool error: ${e.message}`;
        }

        // Update tool message with real result
        setMessages(prev => prev.map(m =>
          m.id === toolMsgId ? { ...m, content: toolResult, imageResult } : m
        ));

        // Get next response — model sees tool result
        const nextId = uid();
        setMessages(prev => [...prev, {
          id: nextId, role: "assistant" as const,
          content: "", timestamp: new Date(), isStreaming: true,
        }]);

        const currentMsgs = await new Promise<Message[]>(r => setMessages(p => { r(p); return p; }));
        const nextHistory = await buildHistory(currentMsgs.filter(m => m.id !== nextId));

        let nextText = "";
        for await (const delta of aiClient.streamChat(
          nextHistory, selectedModel, { temperature: 0.3 }, signal
        )) {
          nextText += delta.text;
          const display2 = sanitizeResponse(nextText);
          setMessages(prev => prev.map(m =>
            m.id === nextId ? { ...m, content: display2 } : m
          ));
          if (parseToolCall(nextText)) break;
        }

        // Intercept fake execution in follow-ups too
        if (detectFakeExecution(nextText) && !parseToolCall(nextText)) {
          const fixHistory: ChatMessage[] = [
            ...nextHistory,
            { role: "assistant", content: nextText },
            { role: "user", content: FORCE_EXECUTION },
          ];
          nextText = "";
          for await (const delta of aiClient.streamChat(fixHistory, selectedModel, { temperature: 0 }, signal)) {
            nextText += delta.text;
            setMessages(prev => prev.map(m => m.id === nextId ? { ...m, content: nextText } : m));
            if (parseToolCall(nextText)) break;
          }
        }

        setMessages(prev => prev.map(m =>
          m.id === nextId ? { ...m, isStreaming: false } : m
        ));

        if (ttsEnabled && nextText && !parseToolCall(nextText)) {
          voice.speak(nextText);
        }

        // Check for another tool call
        toolCall = parseToolCall(nextText);
        fullText = nextText;
        steps++;
      }

      // Normal finish (no tools used)
      if (steps === 0) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, isStreaming: false, tokens } : m
        ));
        if (ttsEnabled && fullText) voice.speak(fullText);
      }

    } catch (e: any) {
      if (e.name === "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: (m.content || "") + "\n\n*[stopped]*", isStreaming: false }
            : m
        ));
      } else {
        let errMsg = e.message ?? "Unknown error";
        if (errMsg.includes("retired") || errMsg.includes("deprecated")) {
          errMsg = `Model retired. Open ⚙ Settings → pick a different model.`;
        } else if (backend === "openrouter") {
          errMsg = `**OpenRouter:** ${errMsg}\n\nFree :free models need no key — check ⚙ Settings.`;
        } else {
          errMsg = `**Ollama:** ${errMsg}`;
        }
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: errMsg, isStreaming: false, role: "error" as any }
            : m
        ));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [messages, selectedModel, isGenerating, enabledTools, temperature, backend, ttsEnabled]); // eslint-disable-line

  const stopGeneration = useCallback(() => { abortRef.current?.abort(); voice.stopSpeaking(); }, []);
  const clearMessages  = useCallback(() => setMessages([]), []);

  return {
    connection, checkConnection,
    backend, setBackend,
    models, selectedModel, setSelectedModel,
    ollamaUrl, setOllamaUrl,
    openrouterKey, setOpenrouterKey,
    enabledTools, setEnabledTools,
    temperature, setTemperature,
    voiceEnabled, ttsEnabled, toggleVoice, toggleTTS,
    messages, isGenerating,
    sendMessage, stopGeneration, clearMessages,
  };
}
