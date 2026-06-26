import React, { useState } from "react";
import { RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { ConnectionState } from "@/hooks/useOllama";
import type { OllamaModel } from "@/integrations/ollama/client";

interface Props {
  connection: ConnectionState;
  models: OllamaModel[];
  selectedModel: string;
  onModelChange: (m: string) => void;
  onRetry: () => void;
  ollamaUrl: string;
  onUrlChange: (url: string) => void;
}

export function ConnectionBar({ connection, models, selectedModel, onModelChange, onRetry, ollamaUrl, onUrlChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ollamaUrl);

  const { status, latencyMs, version } = connection;

  const Icon = status === "checking" ? Loader2 : status === "connected" ? Wifi : WifiOff;
  const iconClass = status === "checking"
    ? "text-warning animate-spin"
    : status === "connected"
    ? "text-success"
    : "text-destructive";

  const label = status === "checking"
    ? "Connecting…"
    : status === "connected"
    ? `Connected${latencyMs ? ` · ${latencyMs}ms` : ""}${version ? ` · v${version}` : ""}`
    : "Disconnected";

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50 bg-muted/5 text-xs flex-wrap">
      {/* Status */}
      <button onClick={onRetry} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity group">
        <Icon className={`w-3 h-3 ${iconClass}`} />
        <span className={`font-mono-tech ${iconClass}`}>{label}</span>
      </button>

      <span className="text-border">│</span>

      {/* URL */}
      {editing ? (
        <form className="flex items-center gap-1.5" onSubmit={(e) => {
          e.preventDefault();
          onUrlChange(draft);
          setEditing(false);
          onRetry();
        }}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono-tech bg-secondary border border-primary/40 rounded px-2 py-0.5 text-primary outline-none w-56 text-xs"
          />
          <button type="submit" className="text-primary hover:opacity-70">✓</button>
          <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">✕</button>
        </form>
      ) : (
        <button
          onClick={() => { setDraft(ollamaUrl); setEditing(true); }}
          className="font-mono-tech text-muted-foreground hover:text-primary transition-colors"
          title="Click to edit Ollama URL"
        >
          {ollamaUrl}
        </button>
      )}

      {/* Model selector */}
      {models.length > 0 && (
        <>
          <span className="text-border">│</span>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="font-mono-tech bg-transparent text-primary border-none outline-none cursor-pointer text-xs hover:opacity-80"
          >
            {models.map((m) => (
              <option key={m.name} value={m.name} className="bg-card text-foreground">
                {m.name}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Offline tip */}
      {status === "disconnected" && (
        <div className="ml-auto flex items-center gap-2 text-destructive/70 font-mono-tech">
          <span>Run:</span>
          <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px]">OLLAMA_ORIGINS=* ollama serve</code>
        </div>
      )}
    </div>
  );
}
