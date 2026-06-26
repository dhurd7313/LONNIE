// src/integrations/ollama/client.ts
// Real Ollama API client with streaming, model management, CORS handling

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[]; // base64 strings for vision models
}

export interface OllamaChatOptions {
  temperature?: number;
  num_predict?: number;
  top_k?: number;
  top_p?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: OllamaChatOptions;
}

export interface OllamaStreamDelta {
  text: string;
  done: boolean;
  evalCount?: number;
  promptEvalCount?: number;
  totalDurationMs?: number;
}

export interface OllamaPingResult {
  ok: boolean;
  latencyMs: number;
  version?: string;
  error?: string;
}

class OllamaClient {
  private _baseUrl: string;

  constructor() {
    this._baseUrl = this.resolveBaseUrl();
  }

  private resolveBaseUrl(): string {
    const envUrl = import.meta.env.VITE_OLLAMA_API_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    // Default — Ollama's standard local port
    return "http://localhost:11434";
  }

  get baseUrl() {
    return this._baseUrl;
  }

  setBaseUrl(url: string) {
    this._baseUrl = url.replace(/\/$/, "");
  }

  /** Quick liveness check — returns latency and version */
  async ping(): Promise<OllamaPingResult> {
    const t0 = performance.now();
    try {
      const res = await fetch(`${this._baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000),
        // No custom headers so we don't trigger CORS preflight unnecessarily
      });
      const latencyMs = Math.round(performance.now() - t0);
      if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
      const data = await res.json().catch(() => ({}));
      return { ok: true, latencyMs, version: data.version };
    } catch (e: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - t0),
        error: e?.message ?? String(e),
      };
    }
  }

  /** List all locally available models */
  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this._baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Ollama /api/tags returned ${res.status}`);
    const data = await res.json();
    return ((data.models as OllamaModel[]) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /** Stream a chat completion — yields text deltas */
  async *streamChat(
    req: OllamaChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<OllamaStreamDelta> {
    const res = await fetch(`${this._baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message = `Ollama error ${res.status}`;
      try {
        message = JSON.parse(body).error ?? message;
      } catch {}
      throw new Error(message);
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
            if (chunk.message?.content) {
              yield {
                text: chunk.message.content,
                done: !!chunk.done,
                evalCount: chunk.eval_count,
                promptEvalCount: chunk.prompt_eval_count,
                totalDurationMs: chunk.total_duration
                  ? Math.round(chunk.total_duration / 1_000_000)
                  : undefined,
              };
            }
            if (chunk.done) return;
          } catch {
            // malformed line — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /** Non-streaming single response */
  async chat(req: OllamaChatRequest): Promise<string> {
    const res = await fetch(`${this._baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.message?.content ?? "";
  }

  /** Stream model pull progress */
  async *pullModel(
    name: string,
    signal?: AbortSignal
  ): AsyncGenerator<{ status: string; percent?: number }> {
    const res = await fetch(`${this._baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
      signal,
    });
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(Boolean)) {
          try {
            const chunk = JSON.parse(line);
            const pct =
              chunk.total && chunk.completed
                ? Math.round((chunk.completed / chunk.total) * 100)
                : undefined;
            yield { status: chunk.status ?? "", percent: pct };
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /** Delete a model */
  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${this._baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  }
}

// Singleton — import { ollamaClient } everywhere
export const ollamaClient = new OllamaClient();
