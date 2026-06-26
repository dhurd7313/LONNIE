export type BackendType = "openrouter" | "ollama";

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  context?: number;
  free?: boolean;
  vision?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface StreamDelta {
  text: string;
  done: boolean;
  promptTokens?: number;
  completionTokens?: number;
}

export interface PingResult {
  ok: boolean;
  latencyMs: number;
  version?: string;
  backend: BackendType;
  error?: string;
}

const BROKEN_PATTERNS = ["cogito", "wormgpt", "blackgrg", "retired", "deprecated", "671b"];
const isBroken = (id: string) => BROKEN_PATTERNS.some(p => id.toLowerCase().includes(p));

export const OPENROUTER_FREE_MODELS: AIModel[] = [
  { id: "meta-llama/llama-3.3-70b-instruct:free",       name: "Llama 3.3 70B",      description: "Best free overall",        context: 131072, free: true },
  { id: "meta-llama/llama-3.1-8b-instruct:free",        name: "Llama 3.1 8B",       description: "Fast & light",             context: 131072, free: true },
  { id: "mistralai/mistral-nemo:free",                   name: "Mistral Nemo 12B",   description: "Efficient, multilingual",  context: 128000, free: true },
  { id: "mistralai/mistral-7b-instruct:free",            name: "Mistral 7B",         description: "Reliable classic",         context: 32768,  free: true },
  { id: "google/gemma-3-27b-it:free",                   name: "Gemma 3 27B",        description: "Google open model",        context: 96000,  free: true },
  { id: "google/gemma-3-12b-it:free",                   name: "Gemma 3 12B",        description: "Google, fast",             context: 96000,  free: true },
  { id: "qwen/qwen3-14b:free",                          name: "Qwen3 14B",          description: "Strong reasoning",         context: 40960,  free: true },
  { id: "qwen/qwen3-8b:free",                           name: "Qwen3 8B",           description: "Qwen lightweight",         context: 40960,  free: true },
  { id: "deepseek/deepseek-r1:free",                    name: "DeepSeek R1",        description: "Best free reasoning",      context: 163840, free: true },
  { id: "deepseek/deepseek-chat-v3-0324:free",          name: "DeepSeek Chat V3",   description: "DeepSeek conversational",  context: 131072, free: true },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct:free",  name: "Nemotron 70B",       description: "NVIDIA-tuned Llama",       context: 131072, free: true },
  { id: "microsoft/phi-3-medium-128k-instruct:free",    name: "Phi-3 Medium",       description: "Microsoft compact",        context: 128000, free: true },
];

export const OPENROUTER_PAID_MODELS: AIModel[] = [
  { id: "openai/gpt-4o",               name: "GPT-4o",            description: "OpenAI flagship · vision ✓",   context: 128000,  vision: true },
  { id: "openai/gpt-4o-mini",          name: "GPT-4o Mini",       description: "Fast & cheap · vision ✓",      context: 128000,  vision: true },
  { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5", description: "Anthropic · vision ✓",         context: 200000,  vision: true },
  { id: "anthropic/claude-opus-4",     name: "Claude Opus 4",     description: "Most capable · vision ✓",      context: 200000,  vision: true },
  { id: "google/gemini-pro-1.5",       name: "Gemini 1.5 Pro",    description: "1M context · vision ✓",        context: 1000000, vision: true },
  { id: "google/gemini-flash-1.5",     name: "Gemini 1.5 Flash",  description: "Google fast · vision ✓",       context: 1000000, vision: true },
  { id: "x-ai/grok-2-1212",           name: "Grok 2",            description: "xAI · less filtered",          context: 131072 },
  { id: "deepseek/deepseek-r1",        name: "DeepSeek R1",       description: "Paid tier, faster",            context: 163840 },
  { id: "mistralai/mistral-large",     name: "Mistral Large",     description: "Mistral premium",              context: 128000 },
];

export const COMMON_OLLAMA_MODELS: AIModel[] = [
  { id: "llama3.2",       name: "Llama 3.2 3B",    description: "Fast, pull this first", context: 131072 },
  { id: "llama3.1",       name: "Llama 3.1 8B",    description: "Balanced",              context: 131072 },
  { id: "llama3.1:70b",   name: "Llama 3.1 70B",   description: "Large, needs 40GB RAM", context: 131072 },
  { id: "mistral",        name: "Mistral 7B",       description: "Fast, reliable",        context: 32768  },
  { id: "qwen2.5",        name: "Qwen 2.5",         description: "Multilingual",          context: 32768  },
  { id: "qwen2.5-coder",  name: "Qwen 2.5 Coder",  description: "Code specialist",       context: 32768  },
  { id: "deepseek-r1",    name: "DeepSeek R1",      description: "Reasoning",             context: 65536  },
  { id: "phi3",           name: "Phi-3 Mini",       description: "Small & fast",          context: 128000 },
  { id: "gemma2",         name: "Gemma 2",          description: "Google efficient",      context: 8192   },
  { id: "llava",          name: "LLaVA (vision)",   description: "Image analysis ✓",      context: 4096, vision: true },
  { id: "codellama",      name: "Code Llama",       description: "Code generation",       context: 16384  },
  { id: "mixtral",        name: "Mixtral 8x7B",     description: "High quality MoE",      context: 32768  },
];

export const ALL_OPENROUTER_MODELS = [...OPENROUTER_FREE_MODELS, ...OPENROUTER_PAID_MODELS];

const SAFE_DEFAULT_OPENROUTER = "meta-llama/llama-3.3-70b-instruct:free";
const SAFE_DEFAULT_OLLAMA     = "llama3.2";

class AIClient {
  private _backend:        BackendType = "openrouter";
  private _ollamaUrl:      string      = "http://localhost:11434";
  private _openrouterKey:  string      = "";
  private _model:          string      = SAFE_DEFAULT_OPENROUTER;

  constructor() {
    this._hydrate();
  }

  private _hydrate() {
    try {
      const s = JSON.parse(localStorage.getItem("lonnie_v2_settings") ?? "{}");
      if (s.backend)       this._backend       = s.backend;
      if (s.ollamaUrl)     this._ollamaUrl     = s.ollamaUrl.replace(/\/$/, "");
      if (s.openrouterKey) this._openrouterKey = s.openrouterKey;

      // Only accept model if it's not broken
      if (s.model && !isBroken(s.model)) {
        this._model = s.model;
      } else {
        this._model = this._backend === "ollama" ? SAFE_DEFAULT_OLLAMA : SAFE_DEFAULT_OPENROUTER;
      }
    } catch {}

    // Env vars override localStorage
    if (import.meta.env.VITE_OPENROUTER_API_KEY) this._openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (import.meta.env.VITE_OLLAMA_API_URL)     this._ollamaUrl     = import.meta.env.VITE_OLLAMA_API_URL;
    if (import.meta.env.VITE_API_BACKEND)        this._backend       = import.meta.env.VITE_API_BACKEND as BackendType;
    if (import.meta.env.VITE_DEFAULT_MODEL && !isBroken(import.meta.env.VITE_DEFAULT_MODEL)) {
      this._model = import.meta.env.VITE_DEFAULT_MODEL;
    }
  }

  get backend()       { return this._backend; }
  get ollamaUrl()     { return this._ollamaUrl; }
  get openrouterKey() { return this._openrouterKey; }
  get model()         { return this._model; }

  setBackend(b: BackendType)  { this._backend = b; }
  setOllamaUrl(u: string)     { this._ollamaUrl = u.replace(/\/$/, ""); }
  setOpenRouterKey(k: string) { this._openrouterKey = k.trim(); }
  setSelectedModel(m: string) { this._model = isBroken(m) ? SAFE_DEFAULT_OPENROUTER : m; }

  async ping(): Promise<PingResult> {
    const t0 = performance.now();
    const ms = () => Math.round(performance.now() - t0);

    if (this._backend === "openrouter") {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: this._openrouterKey ? { Authorization: `Bearer ${this._openrouterKey}` } : {},
          signal: AbortSignal.timeout(7000),
        });
        // 401 = reachable, no key — free models still work
        if (res.ok || res.status === 401) return { ok: true, latencyMs: ms(), backend: "openrouter" };
        return { ok: false, latencyMs: ms(), backend: "openrouter", error: `HTTP ${res.status}` };
      } catch (e: any) {
        return { ok: false, latencyMs: ms(), backend: "openrouter", error: e.message };
      }
    } else {
      try {
        const res = await fetch(`${this._ollamaUrl}/api/version`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return { ok: false, latencyMs: ms(), backend: "ollama", error: `HTTP ${res.status}` };
        const data = await res.json().catch(() => ({}));
        return { ok: true, latencyMs: ms(), backend: "ollama", version: data.version };
      } catch (e: any) {
        return { ok: false, latencyMs: ms(), backend: "ollama", error: e.message };
      }
    }
  }

  async listModels(): Promise<AIModel[]> {
    if (this._backend === "openrouter") return ALL_OPENROUTER_MODELS;
    try {
      const res = await fetch(`${this._ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return COMMON_OLLAMA_MODELS;
      const data = await res.json();
      const installed: AIModel[] = ((data.models ?? []) as any[])
        .filter((m: any) => !isBroken(m.name))
        .map((m: any) => ({
          id: m.name,
          name: m.name,
          description: [m.details?.parameter_size, m.details?.quantization_level].filter(Boolean).join(" "),
          vision: /llava|vision|bakllava/i.test(m.name),
        }));
      return installed.length > 0 ? installed : COMMON_OLLAMA_MODELS;
    } catch {
      return COMMON_OLLAMA_MODELS;
    }
  }

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: { temperature?: number } = {},
    signal?: AbortSignal
  ): AsyncGenerator<StreamDelta> {
    // Hard block broken models — swap before sending
    if (isBroken(model)) {
      model = this._backend === "ollama" ? SAFE_DEFAULT_OLLAMA : SAFE_DEFAULT_OPENROUTER;
    }
    if (this._backend === "openrouter") {
      yield* this._openRouter(messages, model, opts, signal);
    } else {
      yield* this._ollama(messages, model, opts, signal);
    }
  }

  private async *_openRouter(
    messages: ChatMessage[],
    model: string,
    opts: { temperature?: number },
    signal?: AbortSignal
  ): AsyncGenerator<StreamDelta> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://lonnie.app",
      "X-Title": "LONNIE",
    };
    if (this._openrouterKey) headers["Authorization"] = `Bearer ${this._openrouterKey}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: 4096,
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let msg = `OpenRouter ${res.status}`;
      try { msg = JSON.parse(body).error?.message ?? msg; } catch {}
      if (res.status === 404) msg = `Model not found: "${model}". Open ⚙ Settings and pick a different model.`;
      if (res.status === 429) msg = `Rate limited. Wait 30 seconds, then try again. Or add an API key in ⚙ Settings for higher limits.`;
      if (res.status === 402) msg = `This model requires credits. Use a :free model or add billing at openrouter.ai`;
      if (msg.includes("retired") || msg.includes("deprecated")) msg = `Model "${model}" retired. Open ⚙ Settings → pick a new model.`;
      throw new Error(msg);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t || t === "data: [DONE]") continue;
          if (!t.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(t.slice(6));
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) yield { text: delta, done: false };
            if (chunk.choices?.[0]?.finish_reason) {
              yield { text: "", done: true, promptTokens: chunk.usage?.prompt_tokens, completionTokens: chunk.usage?.completion_tokens };
              return;
            }
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }

  private async *_ollama(
    messages: ChatMessage[],
    model: string,
    opts: { temperature?: number },
    signal?: AbortSignal
  ): AsyncGenerator<StreamDelta> {
    const res = await fetch(`${this._ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
        stream: true,
        options: { temperature: opts.temperature ?? 0.7 },
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let msg = `Ollama ${res.status}`;
      try { msg = JSON.parse(body).error ?? msg; } catch {}
      if (res.status === 410) msg = `Model "${model}" no longer exists in Ollama. Run: ollama pull llama3.2`;
      throw new Error(msg);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.message?.content) yield { text: chunk.message.content, done: !!chunk.done };
            if (chunk.done) return;
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }
}

export const aiClient  = new AIClient();
export const ollamaClient = aiClient;

// Uncensored model additions
// Appended to existing exports
export const UNCENSORED_OLLAMA_MODELS: AIModel[] = [
  { id: "dolphin-mistral",           name: "Dolphin Mistral",        description: "Uncensored · fast · recommended",  context: 32768 },
  { id: "dolphin-llama3",            name: "Dolphin Llama3 8B",      description: "Uncensored · Llama3 base",         context: 131072 },
  { id: "dolphin-llama3:70b",        name: "Dolphin Llama3 70B",     description: "Uncensored · large",               context: 131072 },
  { id: "wizard-vicuna-uncensored",  name: "Wizard Vicuna Uncensored", description: "Uncensored classic",             context: 4096 },
  { id: "llama2-uncensored",         name: "Llama2 Uncensored",      description: "Uncensored Llama2",                context: 4096 },
  { id: "dolphin-phi",               name: "Dolphin Phi",            description: "Uncensored · small · fast",        context: 4096 },
  { id: "samantha-mistral",          name: "Samantha Mistral",       description: "Uncensored · conversational",      context: 32768 },
  { id: "goliath-120b",              name: "Goliath 120B",           description: "Uncensored · very large",          context: 4096 },
];

export const UNCENSORED_OPENROUTER_MODELS: AIModel[] = [
  { id: "gryphe/mythomax-l2-13b:free",              name: "MythoMax 13B (free)",        description: "Uncensored · free tier", context: 4096, free: true },
  { id: "undi95/toppy-m-7b:free",                   name: "Toppy M 7B (free)",          description: "Uncensored · free",      context: 4096, free: true },
  { id: "nousresearch/nous-capybara-7b:free",        name: "Nous Capybara 7B (free)",    description: "Uncensored · free",      context: 8192, free: true },
  { id: "gryphe/mythomax-l2-13b",                   name: "MythoMax 13B",               description: "Uncensored · creative",  context: 4096 },
  { id: "neversleep/noromaid-mixtral-8x7b-instruct", name: "Noromaid Mixtral 8x7B",      description: "Uncensored · powerful",  context: 8192 },
  { id: "undi95/remm-slerp-l2-13b",                 name: "ReMM SLERP L2 13B",          description: "Uncensored",             context: 4096 },
  { id: "koboldai/psyfighter2-13b",                 name: "PsyFighter2 13B",            description: "Uncensored · roleplay",  context: 4096 },
];
