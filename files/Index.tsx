import React, { useEffect, useRef, useState } from "react";
import { Trash2, PanelRight, Zap, ChevronDown } from "lucide-react";
import { useOllama } from "@/hooks/useOllama";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConnectionBar } from "@/components/ConnectionBar";
import { ToolsPanel } from "@/components/ToolsPanel";
import type { ToolName } from "@/services/tools";

const STARTERS = [
  "What's the current time and date?",
  "Search the web for latest AI news",
  "Remember my name is Lonnie",
  "Read a file from my computer",
  "What tools do you have available?",
  "Open GitHub in a new tab",
  "Check my clipboard contents",
  "List my stored memories",
];

export default function Index() {
  const {
    connection, checkConnection,
    models, selectedModel, setSelectedModel,
    ollamaUrl, setOllamaUrl,
    enabledTools, setEnabledTools,
    temperature, setTemperature,
    messages, isGenerating,
    sendMessage, stopGeneration, clearMessages,
  } = useOllama();

  const [sidebar, setSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTool = (tool: ToolName, on: boolean) => {
    setEnabledTools((prev) => on ? [...prev, tool] : prev.filter((t) => t !== tool));
  };

  const offline = connection.status === "disconnected";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden scanline">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/20 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
            {connection.status === "connected" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border-2 border-background" />
            )}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-display font-bold text-primary text-glow tracking-widest">LONNIE</div>
            <div className="text-[9px] font-mono-tech text-muted-foreground/60 tracking-wider">AUTONOMOUS AI · LOCAL</div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearMessages} title="Clear chat"
              className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setSidebar((s) => !s)} title="Toggle sidebar"
            className={`w-7 h-7 rounded-lg hover:bg-secondary/80 flex items-center justify-center transition-all ${sidebar ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`}>
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Connection bar ──────────────────────────────────────────────────── */}
      <ConnectionBar
        connection={connection}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onRetry={() => checkConnection()}
        ollamaUrl={ollamaUrl}
        onUrlChange={setOllamaUrl}
      />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-3">
            {messages.length === 0 ? (
              <EmptyState
                status={connection.status}
                model={selectedModel}
                toolCount={enabledTools.length}
                onPrompt={sendMessage}
              />
            ) : (
              <>
                {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
                <div ref={bottomRef} className="h-4" />
              </>
            )}
          </div>
          <ChatInput
            onSend={sendMessage}
            onStop={stopGeneration}
            isGenerating={isGenerating}
            disabled={offline}
          />
        </div>

        {/* Sidebar */}
        {sidebar && (
          <div className="w-56 flex-shrink-0 border-l border-border/50 bg-card/10 backdrop-blur-sm overflow-hidden">
            <ToolsPanel
              enabledTools={enabledTools}
              onToggle={toggleTool}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              modelName={selectedModel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ status, model, toolCount, onPrompt }: {
  status: string; model: string; toolCount: number;
  onPrompt: (t: string) => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 py-8">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="w-full h-full rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <span className="text-2xl font-display text-primary">L</span>
          </div>
          {status === "connected" && (
            <>
              <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-ping opacity-30" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
            </>
          )}
        </div>
        <h2 className="text-lg font-display font-bold text-primary text-glow mb-1">
          {status === "connected" ? "LONNIE Ready" : status === "checking" ? "Connecting…" : "Offline"}
        </h2>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          {status === "connected"
            ? `Running ${model} locally · ${toolCount} capabilities active · all data stays on your machine`
            : status === "checking"
            ? "Reaching out to Ollama…"
            : "Ollama isn't running. Start it with: ollama serve"}
        </p>
      </div>

      {status === "connected" && (
        <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm">
          {STARTERS.map((s) => (
            <button key={s} onClick={() => onPrompt(s)}
              className="text-left px-2.5 py-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 hover:border-primary/25 text-[11px] text-muted-foreground hover:text-foreground transition-all group leading-tight">
              <span className="text-primary/70 group-hover:text-primary mr-1">›</span>{s}
            </button>
          ))}
        </div>
      )}

      {status === "disconnected" && (
        <div className="w-full max-w-sm bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-xs font-mono-tech space-y-2">
          <p className="text-destructive/80 font-semibold">Quick Fix</p>
          <div className="space-y-1.5 text-muted-foreground">
            <p><span className="text-primary">1.</span> Install → <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ollama.com</a></p>
            <p><span className="text-primary">2.</span> Enable CORS: <code className="bg-secondary px-1 rounded text-[10px]">OLLAMA_ORIGINS=*</code></p>
            <p><span className="text-primary">3.</span> Start: <code className="bg-secondary px-1 rounded text-[10px]">ollama serve</code></p>
            <p><span className="text-primary">4.</span> Pull model: <code className="bg-secondary px-1 rounded text-[10px]">ollama pull llama3.2</code></p>
          </div>
          <p className="text-muted-foreground/50 text-[9px] pt-1">App retries every 30 seconds automatically</p>
        </div>
      )}
    </div>
  );
}
