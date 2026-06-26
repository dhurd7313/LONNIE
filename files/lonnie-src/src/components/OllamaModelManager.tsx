import React, { useState, useEffect, useCallback } from "react";
import { Download, Trash2, RefreshCw, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { aiClient, COMMON_OLLAMA_MODELS, type AIModel } from "@/integrations/ollama/client";

interface PullState {
  status: string;
  percent?: number;
  error?: string;
  done?: boolean;
}

interface Props {
  selectedModel: string;
  onModelChange: (m: string) => void;
}

export function OllamaModelManager({ selectedModel, onModelChange }: Props) {
  const [installed, setInstalled]   = useState<AIModel[]>([]);
  const [loading, setLoading]       = useState(false);
  const [pulling, setPulling]       = useState<Record<string, PullState>>({});
  const [showSuggested, setShowSuggested] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${aiClient.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const BROKEN = ["cogito","wormgpt","blackgrg","retired","deprecated","671b"];
      const clean: AIModel[] = (data.models ?? [])
        .filter((m: any) => !BROKEN.some(b => m.name.toLowerCase().includes(b)))
        .map((m: any) => ({
          id: m.name,
          name: m.name,
          description: [m.details?.parameter_size, m.details?.quantization_level]
            .filter(Boolean).join(" "),
          vision: /llava|vision|bakllava/i.test(m.name),
        }));

      setInstalled(clean);

      // Auto-select first model if current is broken/missing
      const BROKEN_CURRENT = BROKEN.some(b => selectedModel.toLowerCase().includes(b));
      const inList = clean.find(m => m.id === selectedModel);
      if ((BROKEN_CURRENT || !inList) && clean.length > 0) {
        onModelChange(clean[0].id);
      }
    } catch {
      setInstalled([]);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, onModelChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const pullModel = useCallback(async (modelId: string) => {
    setPulling(p => ({ ...p, [modelId]: { status: "Starting…" } }));

    try {
      const res = await fetch(`${aiClient.ollamaUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId, stream: true }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

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
            const pct = chunk.total && chunk.completed
              ? Math.round((chunk.completed / chunk.total) * 100)
              : undefined;
            setPulling(p => ({
              ...p,
              [modelId]: { status: chunk.status ?? "", percent: pct },
            }));
          } catch {}
        }
      }

      setPulling(p => ({ ...p, [modelId]: { status: "Done!", percent: 100, done: true } }));
      await refresh();
      onModelChange(modelId);
      // Clear done state after 3s
      setTimeout(() => setPulling(p => {
        const next = { ...p };
        delete next[modelId];
        return next;
      }), 3000);

    } catch (e: any) {
      setPulling(p => ({ ...p, [modelId]: { status: "Failed", error: e.message } }));
    }
  }, [refresh, onModelChange]);

  const deleteModel = useCallback(async (modelId: string) => {
    if (!confirm(`Delete "${modelId}" from Ollama? You can re-pull it anytime.`)) return;
    try {
      await fetch(`${aiClient.ollamaUrl}/api/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId }),
      });
      await refresh();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  }, [refresh]);

  // Suggested models not yet installed
  const notInstalled = COMMON_OLLAMA_MODELS.filter(
    m => !installed.find(i => i.id === m.id)
  );

  return (
    <div className="space-y-3">

      {/* Installed models */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
            Installed Models
          </label>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors">
            <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`} />
            refresh
          </button>
        </div>

        {installed.length === 0 ? (
          <div className="px-3 py-3 rounded-xl bg-secondary/20 border border-border/30 text-center">
            <p className="text-xs text-muted-foreground/60">No models installed yet.</p>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">Pull one from the list below.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {installed.map(m => (
              <div key={m.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer group ${
                  selectedModel === m.id
                    ? "bg-primary/10 border-primary/30"
                    : "bg-secondary/20 border-transparent hover:border-border/50"
                }`}
                onClick={() => onModelChange(m.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{m.name}</span>
                    {m.vision && (
                      <span className="text-[9px] font-mono-tech text-accent/70 bg-accent/10 px-1 rounded">vision</span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-[10px] text-muted-foreground/50">{m.description}</p>
                  )}
                </div>
                {selectedModel === m.id && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                <button
                  onClick={e => { e.stopPropagation(); deleteModel(m.id); }}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete model"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull new models */}
      <div>
        <button
          onClick={() => setShowSuggested(s => !s)}
          className="flex items-center justify-between w-full text-[10px] font-mono-tech text-muted-foreground/50 uppercase tracking-widest hover:text-primary transition-colors mb-1.5"
        >
          <span>Pull New Model ({notInstalled.length} available)</span>
          {showSuggested ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showSuggested && (
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {notInstalled.map(m => {
              const state = pulling[m.id];
              const isPulling = state && !state.done && !state.error;
              return (
                <div key={m.id} className="px-3 py-2 rounded-xl bg-secondary/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground/80">{m.name}</span>
                        {m.vision && (
                          <span className="text-[9px] font-mono-tech text-accent/70 bg-accent/10 px-1 rounded">vision</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/50">{m.description}</p>
                    </div>
                    {!state ? (
                      <button
                        onClick={() => pullModel(m.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-mono-tech transition-all flex-shrink-0"
                      >
                        <Download className="w-2.5 h-2.5" />
                        Pull
                      </button>
                    ) : state.done ? (
                      <span className="text-[10px] text-success font-mono-tech flex-shrink-0">✓ Done</span>
                    ) : state.error ? (
                      <button onClick={() => setPulling(p => { const n = {...p}; delete n[m.id]; return n; })}
                        className="text-[10px] text-destructive/70 font-mono-tech flex-shrink-0 flex items-center gap-1">
                        <X className="w-2.5 h-2.5" /> Failed
                      </button>
                    ) : null}
                  </div>

                  {/* Progress bar */}
                  {isPulling && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] font-mono-tech text-muted-foreground/50 mb-1">
                        <span className="truncate max-w-[180px]">{state.status}</span>
                        {state.percent !== undefined && <span>{state.percent}%</span>}
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${state.percent ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {state?.error && (
                    <p className="text-[10px] text-destructive/70 mt-1 font-mono-tech">{state.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
