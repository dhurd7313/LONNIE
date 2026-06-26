import React, { useState } from "react";
import { Wifi, WifiOff, Loader2, Settings, AlertTriangle } from "lucide-react";
import type { ConnectionState } from "@/hooks/useOllama";
import type { AIModel, BackendType } from "@/integrations/ollama/client";

const BROKEN_PATTERNS = ["cogito", "wormgpt", "blackgrg", "retired", "deprecated", "671b"];
const isBroken = (id: string) => BROKEN_PATTERNS.some(p => id.toLowerCase().includes(p));

interface Props {
  connection: ConnectionState;
  models: AIModel[];
  selectedModel: string;
  onModelChange: (m: string) => void;
  onRetry: () => void;
  onOpenSettings: () => void;
  ollamaUrl: string;
  onUrlChange: (u: string) => void;
  backend: BackendType;
}

export function ConnectionBar({
  connection, models, selectedModel,
  onModelChange, onRetry, onOpenSettings, backend,
}: Props) {
  const { status, latencyMs, version } = connection;

  const Icon = status === "checking" ? Loader2 : status === "connected" ? Wifi : WifiOff;
  const iconClass =
    status === "checking"    ? "text-warning animate-spin" :
    status === "connected"   ? "text-success" :
                               "text-destructive";

  const label =
    status === "checking"    ? "Connecting…" :
    status === "connected"   ? `Connected${latencyMs ? ` · ${latencyMs}ms` : ""}${version && version !== "no-key" ? ` · v${version}` : ""}` :
                               "Disconnected";

  // Filter out broken/retired models from dropdown
  const cleanModels = models.filter(m => !isBroken(m.id));
  const modelBroken = isBroken(selectedModel);

  // Find display name
  const modelDisplay = cleanModels.find(m => m.id === selectedModel)?.name
    ?? (modelBroken ? "⚠ Broken model" : selectedModel.split("/").pop() ?? selectedModel);

  return (
    <div className="flex-shrink-0">
      {/* Broken model warning banner */}
      {modelBroken && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/30">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive/90 flex-1">
            <span className="font-semibold">Broken model detected.</span> "{selectedModel}" is retired or invalid.
          </p>
          <button onClick={onOpenSettings}
            className="text-xs text-destructive font-semibold underline hover:no-underline flex-shrink-0">
            Fix in Settings →
          </button>
        </div>
      )}

      {/* Main bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/40 bg-muted/5 text-xs flex-wrap min-h-[30px]">
        {/* Status */}
        <button onClick={onRetry} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
          <Icon className={`w-3 h-3 ${iconClass}`} />
          <span className={`font-mono-tech ${iconClass}`}>{label}</span>
        </button>

        <span className="text-border/70">│</span>
        <span className="font-mono-tech text-muted-foreground/40 text-[10px]">{backend.toUpperCase()}</span>

        {/* Model dropdown — only clean models */}
        {cleanModels.length > 0 && (
          <>
            <span className="text-border/70">│</span>
            <select
              value={modelBroken ? "" : selectedModel}
              onChange={e => onModelChange(e.target.value)}
              className="font-mono-tech bg-transparent text-primary border-none outline-none cursor-pointer text-xs hover:opacity-80 max-w-[200px]"
            >
              {modelBroken && (
                <option value="" disabled className="bg-card text-destructive">
                  ⚠ Pick a model
                </option>
              )}
              {cleanModels.map(m => (
                <option key={m.id} value={m.id} className="bg-card text-foreground text-xs">
                  {m.name ?? m.id}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {status === "disconnected" && backend === "ollama" && (
            <code className="text-[9px] font-mono-tech text-destructive/50 bg-secondary/50 px-1.5 py-0.5 rounded hidden sm:block">
              OLLAMA_ORIGINS=* ollama serve
            </code>
          )}
          {status === "disconnected" && backend === "openrouter" && (
            <span className="text-[10px] font-mono-tech text-destructive/60 hidden sm:block">
              Can't reach OpenRouter
            </span>
          )}
          <button onClick={onOpenSettings}
            className="flex items-center gap-1 text-[10px] font-mono-tech text-muted-foreground/40 hover:text-primary transition-colors">
            <Settings className="w-2.5 h-2.5" />
            settings
          </button>
        </div>
      </div>
    </div>
  );
}
