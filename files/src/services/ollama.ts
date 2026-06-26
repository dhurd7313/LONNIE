export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[]; // base64 for vision models
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_k?: number;
    top_p?: number;
    repeat_penalty?: number;
  };
  tools?: OllamaTool[];
}

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
}

export interface StreamChunk {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

class OllamaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_OLLAMA_API_URL?.replace(/\/$/, "") ||
      "http://localhost:11434";
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; version?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(4000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) return { ok: false, latencyMs };
      const data = await res.json();
      return { ok: true, latencyMs, version: data.version };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = await res.json();
    return (data.models || []).sort((a: OllamaModel, b: OllamaModel) =>
      a.name.localeCompare(b.name)
    );
  }

  async *streamChat(
    req: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<{ delta: string; done: boolean; stats?: StreamChunk }> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Ollama error ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk: StreamChunk = JSON.parse(line);
          if (chunk.message?.content) {
            yield { delta: chunk.message.content, done: chunk.done, stats: chunk };
          }
          if (chunk.done) return;
        } catch {}
      }
    }
  }

  async chat(req: ChatRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.message?.content ?? "";
  }

  async *pullModel(
    name: string,
    signal?: AbortSignal
  ): AsyncGenerator<{ status: string; percent?: number }> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
      signal,
    });
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);
          const percent =
            chunk.total && chunk.completed
              ? Math.round((chunk.completed / chunk.total) * 100)
              : undefined;
          yield { status: chunk.status, percent };
        } catch {}
      }
    }
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  }
}

export const ollama = new OllamaService();
