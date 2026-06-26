import React, { useEffect, useRef, useState } from "react";
import { Trash2, Settings, PanelRight, Zap, Film } from "lucide-react";
import { useOllama } from "@/hooks/useOllama";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConnectionBar } from "@/components/ConnectionBar";
import { ToolsPanel } from "@/components/ToolsPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { VideoAnalyzerModal } from "@/components/VideoAnalyzerModal";
import { WELCOME_MESSAGE } from "@/data/persona";
import { skills } from "@/lib/skills";
import type { ToolName } from "@/services/tools";

const STARTERS = [
  "What do you know about me?",
  "What time is it right now?",
  "What can you do for me?",
  "Search for latest AI news",
  "Remember my name is Lonnie",
  "Get me an image of Times Square",
  "Find the best Italian restaurant in NYC, show me a photo, find the menu",
  "What goals are you tracking?",
];

export default function Index() {
  const {
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
  } = useOllama();

  const [sidebar, setSidebar]             = useState(true);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [videoOpen, setVideoOpen]         = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Init skills on mount
  useEffect(() => { skills.load(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleTool = (tool: ToolName, on: boolean) =>
    setEnabledTools(prev => on ? [...prev, tool] : prev.filter(t => t !== tool));

  // Intercept sends to check for skill triggers
  const handleSend = (content: string, image?: string) => {
    const detected = skills.detect(content);
    if (detected?.id === "watch-video" && !image) {
      // Open video modal instead
      setVideoOpen(true);
      return;
    }
    sendMessage(content, image);
  };

  // Video analysis result → inject into chat as user message
  const handleVideoResult = (report: string) => {
    setVideoOpen(false);
    sendMessage(`Here is the video analysis report. Please review and give me your key insights:\n\n${report}`);
  };

  const isOffline = connection.status === "disconnected";
  const modelDisplay = models.find(m => m.id === selectedModel)?.name
    ?? selectedModel.split("/").pop()
    ?? selectedModel;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none scanline opacity-30 z-0" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/30 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
            {connection.status === "connected" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border-2 border-background animate-pulse" />
            )}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-display font-bold text-primary text-glow tracking-widest">LONNIE</div>
            <div className="text-[9px] font-mono-tech text-muted-foreground/50 tracking-wider">
              {connection.status === "connected"
                ? `${modelDisplay} · ${backend.toUpperCase()} · ${enabledTools.length} TOOLS`
                : connection.status === "checking" ? "CONNECTING…" : "OFFLINE"}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {/* Video analyzer button */}
          <button onClick={() => setVideoOpen(true)} title="Video Analyst (watch.skill)"
            className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground/60 hover:text-accent flex items-center justify-center transition-all">
            <Film className="w-3.5 h-3.5" />
          </button>

          {messages.length > 0 && (
            <button onClick={clearMessages} title="Clear chat"
              className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} title="Settings"
            className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setSidebar(s => !s)} title="Toggle panels"
            className={`w-7 h-7 rounded-lg hover:bg-secondary/80 flex items-center justify-center transition-all ${sidebar ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`}>
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Connection bar ── */}
      <div className="relative z-10">
        <ConnectionBar
          connection={connection}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onRetry={checkConnection}
          onOpenSettings={() => setSettingsOpen(true)}
          ollamaUrl={ollamaUrl}
          onUrlChange={setOllamaUrl}
          backend={backend}
        />
      </div>

      {/* ── Body ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-3">
            {messages.length === 0 ? (
              <EmptyState
                status={connection.status}
                model={modelDisplay}
                toolCount={enabledTools.length}
                backend={backend}
                onPrompt={handleSend}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenVideo={() => setVideoOpen(true)}
              />
            ) : (
              <>
                {messages.map(m => <ChatMessage key={m.id} message={m} />)}
                <div ref={bottomRef} className="h-4" />
              </>
            )}
          </div>
          <ChatInput
            onSend={handleSend}
            onStop={stopGeneration}
            isGenerating={isGenerating}
            disabled={isOffline}
            voiceEnabled={voiceEnabled}
            ttsEnabled={ttsEnabled}
            onToggleVoice={toggleVoice}
            onToggleTTS={toggleTTS}
          />
        </div>

        {sidebar && (
          <div className="w-56 flex-shrink-0 border-l border-border/50 bg-card/10 backdrop-blur-sm overflow-hidden">
            <ToolsPanel
              enabledTools={enabledTools}
              onToggle={toggleTool}
              temperature={temperature}
              onTemperatureChange={setTemperature}
            />
          </div>
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        backend={backend}
        onBackendChange={setBackend}
        openrouterKey={openrouterKey}
        onKeyChange={setOpenrouterKey}
        ollamaUrl={ollamaUrl}
        onUrlChange={setOllamaUrl}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onSaveAndReconnect={checkConnection}
      />

      <VideoAnalyzerModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        selectedModel={selectedModel}
        onResult={handleVideoResult}
      />
    </div>
  );
}

function EmptyState({ status, model, toolCount, backend, onPrompt, onOpenSettings, onOpenVideo }: {
  status: string; model: string; toolCount: number; backend: string;
  onPrompt: (t: string) => void;
  onOpenSettings: () => void;
  onOpenVideo: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 py-8">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="w-full h-full rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <span className="text-3xl font-display font-black text-primary text-glow">L</span>
          </div>
          {status === "connected" && (
            <>
              <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-ping opacity-20" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-background" />
            </>
          )}
        </div>
        <h2 className="text-lg font-display font-bold text-primary text-glow mb-1">
          {status === "connected" ? WELCOME_MESSAGE : status === "checking" ? "Initializing…" : "Offline"}
        </h2>
        <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed font-mono-tech">
          {status === "connected"
            ? `${model} · ${backend} · ${toolCount} capabilities · skills active`
            : status === "checking" ? "Reaching backend…"
            : "No connection. Open Settings to configure."}
        </p>
      </div>

      {status === "connected" && (
        <>
          <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm">
            {STARTERS.map(s => (
              <button key={s} onClick={() => onPrompt(s)}
                className="text-left px-2.5 py-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 hover:border-primary/25 text-[11px] text-muted-foreground hover:text-foreground transition-all group leading-snug">
                <span className="text-primary/60 group-hover:text-primary mr-1">›</span>{s}
              </button>
            ))}
          </div>
          <button onClick={onOpenVideo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/25 text-accent text-xs font-mono-tech transition-all">
            <Film className="w-3.5 h-3.5" />
            Analyze a video (watch.skill)
          </button>
        </>
      )}

      {status === "disconnected" && (
        <button onClick={onOpenSettings}
          className="px-5 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-sm font-semibold transition-all">
          Open Settings →
        </button>
      )}
    </div>
  );
}
