import { useState, useEffect, useCallback, useRef } from "react";
import { ollamaClient, type OllamaModel } from "@/integrations/ollama/client";
import { executeTool, parseToolCall, buildSystemPrompt, TOOL_REGISTRY, type ToolName } from "@/services/tools";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  timestamp: Date;
  toolName?: ToolName;
  toolArgs?: Record<string, unknown>;
  isStreaming?: boolean;
  evalCount?: number;
  imageBase64?: string;
}

export interface ConnectionState {
  status: "idle" | "checking" | "connected" | "disconnected";
  latencyMs?: number;
  version?: string;
  error?: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const STORAGE_KEY = "lonnie_settings";

interface Settings {
  model: string;
  ollamaUrl: string;
  enabledTools: ToolName[];
  temperature: number;
}

function loadSettings(): Partial<Settings> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function saveSettings(s: Partial<Settings>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSettings(), ...s })); } catch {}
}

export function useOllama() {
  const saved = loadSettings();

  const [connection, setConnection] = useState<ConnectionState>({ status: "idle" });
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string>(
    saved.model ?? import.meta.env.VITE_OLLAMA_DEFAULT_MODEL ?? "llama3.2"
  );
  const [ollamaUrl, setOllamaUrlState] = useState<string>(
    saved.ollamaUrl ?? import.meta.env.VITE_OLLAMA_API_URL ?? "http://localhost:11434"
  );
  const [enabledTools, setEnabledToolsState] = useState<ToolName[]>(
    saved.enabledTools ?? TOOL_REGISTRY.filter((t) => t.enabledByDefault).map((t) => t.name)
  );
  const [temperature, setTemperatureState] = useState<number>(saved.temperature ?? 0.7);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const setSelectedModel = (m: string) => { setSelectedModelState(m); saveSettings({ model: m }); };
  const setOllamaUrl = (u: string) => { setOllamaUrlState(u); saveSettings({ ollamaUrl: u }); };
  const setEnabledTools = (tools: ToolName[] | ((prev: ToolName[]) => ToolName[])) => {
    setEnabledToolsState((prev) => {
      const next = typeof tools === "function" ? tools(prev) : tools;
      saveSettings({ enabledTools: next });
      return next;
    });
  };
  const setTemperature = (t: number) => { setTemperatureState(t); saveSettings({ temperature: t }); };

  // ── Connection check ─────────────────────────────────────────────────────
  const checkConnection = useCallback(async (url?: string) => {
    const targetUrl = url ?? ollamaUrl;
    ollamaClient.setBaseUrl(targetUrl);
    setConnection({ status: "checking" });

    const result = await ollamaClient.ping();

    if (result.ok) {
      setConnection({ status: "connected", latencyMs: result.latencyMs, version: result.version });
      try {
        const list = await ollamaClient.listModels();
        setModels(list);
        if (list.length > 0) {
          setSelectedModelState((prev) => {
            if (list.find((m) => m.name === prev)) return prev;
            const next = list[0].name;
            saveSettings({ model: next });
            return next;
          });
        }
      } catch (e) {
        console.warn("Could not list models:", e);
      }
    } else {
      setConnection({
        status: "disconnected",
        error: result.error ?? "Cannot reach Ollama",
      });
    }
  }, [ollamaUrl]);

  useEffect(() => {
    checkConnection();
    const timer = setInterval(() => checkConnection(), 30_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    content: string,
    imageBase64?: string
  ) => {
    if ((!content.trim() && !imageBase64) || isGenerating) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content, timestamp: new Date(), imageBase64 };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    abortRef.current = new AbortController();

    const assistantId = uid();
    setMessages((prev) => [...prev, {
      id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true,
    }]);

    // Build message history for Ollama
    const buildHistory = (msgs: ChatMessage[]) => {
      const history = [{ role: "system" as const, content: buildSystemPrompt(enabledTools) }];
      for (const m of msgs) {
        if (m.role === "user") {
          history.push({
            role: "user",
            content: m.content,
            ...(m.imageBase64 ? { images: [m.imageBase64] } : {}) as any,
          });
        } else if (m.role === "assistant" && m.content) {
          history.push({ role: "assistant", content: m.content });
        } else if (m.role === "tool") {
          history.push({ role: "user", content: `TOOL RESULT [${m.toolName}]:\n${m.content}` });
        }
      }
      return history;
    };

    const currentMessages = [...(await new Promise<ChatMessage[]>((r) => setMessages((prev) => { r(prev); return prev; })))];

    try {
      let fullText = "";
      let finalEvalCount: number | undefined;

      for await (const delta of ollamaClient.streamChat(
        {
          model: selectedModel,
          messages: buildHistory(currentMessages),
          options: { temperature },
        },
        abortRef.current.signal
      )) {
        fullText += delta.text;
        if (delta.evalCount) finalEvalCount = delta.evalCount;

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId
            ? { ...m, content: fullText, evalCount: finalEvalCount }
            : m)
        );

        // If we detect a complete tool call block, stop streaming and execute
        if (parseToolCall(fullText)) break;
      }

      // ── Tool call detected ────────────────────────────────────────────────
      const toolCall = parseToolCall(fullText);
      if (toolCall) {
        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, content: fullText, isStreaming: false, toolName: toolCall.tool, toolArgs: toolCall.args }
          : m));

        // Show tool running
        const toolId = uid();
        setMessages((prev) => [...prev, {
          id: toolId, role: "tool", content: "⏳ Running...", toolName: toolCall.tool,
          toolArgs: toolCall.args, timestamp: new Date(),
        }]);

        let toolResult: string;
        try {
          toolResult = await executeTool(toolCall.tool, toolCall.args);
        } catch (e: any) {
          toolResult = `Tool error: ${e.message}`;
        }

        setMessages((prev) => prev.map((m) => m.id === toolId ? { ...m, content: toolResult } : m));

        // Follow-up: send result back to model for natural reply
        const followId = uid();
        setMessages((prev) => [...prev, {
          id: followId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true,
        }]);

        // Build updated history including the tool result
        const updatedMsgs = await new Promise<ChatMessage[]>((r) => setMessages((prev) => { r(prev); return prev; }));

        let followText = "";
        for await (const delta of ollamaClient.streamChat(
          { model: selectedModel, messages: buildHistory(updatedMsgs), options: { temperature } },
          abortRef.current.signal
        )) {
          followText += delta.text;
          setMessages((prev) => prev.map((m) => m.id === followId ? { ...m, content: followText } : m));
        }

        setMessages((prev) => prev.map((m) => m.id === followId ? { ...m, isStreaming: false } : m));

      } else {
        // Normal completion
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId
            ? { ...m, isStreaming: false, evalCount: finalEvalCount }
            : m)
        );
      }

    } catch (e: any) {
      if (e.name === "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, content: (m.content || "") + "\n\n*[generation stopped]*", isStreaming: false }
          : m));
      } else {
        const errMsg = connection.status === "disconnected"
          ? `Cannot connect to Ollama at \`${ollamaUrl}\`.\n\nMake sure it's running:\n\`\`\`\nollama serve\n\`\`\`\nThen check the URL in the connection bar above.`
          : `**Error:** ${e.message}`;

        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, content: errMsg, isStreaming: false, role: "error" as any }
          : m));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [messages, selectedModel, isGenerating, connection.status, enabledTools, temperature, ollamaUrl]);

  const stopGeneration = useCallback(() => abortRef.current?.abort(), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    // Connection
    connection,
    checkConnection,
    // Models
    models,
    selectedModel,
    setSelectedModel,
    // Config
    ollamaUrl,
    setOllamaUrl,
    enabledTools,
    setEnabledTools,
    temperature,
    setTemperature,
    // Chat
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}
