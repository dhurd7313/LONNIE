import React, { useState } from "react";
import { X, Eye, EyeOff, ExternalLink, Check, AlertTriangle, RotateCcw, Lock, Unlock } from "lucide-react";
import {
  OPENROUTER_FREE_MODELS, OPENROUTER_PAID_MODELS,
  UNCENSORED_OPENROUTER_MODELS, UNCENSORED_OLLAMA_MODELS,
  COMMON_OLLAMA_MODELS, type BackendType
} from "@/integrations/ollama/client";
import { resetSettings } from "@/lib/settingsMigration";
import { OllamaModelManager } from "./OllamaModelManager";

interface Props {
  open: boolean; onClose: () => void;
  backend: BackendType; onBackendChange: (b: BackendType) => void;
  openrouterKey: string; onKeyChange: (k: string) => void;
  ollamaUrl: string; onUrlChange: (u: string) => void;
  selectedModel: string; onModelChange: (m: string) => void;
  onSaveAndReconnect: () => void;
}

type ModelTab = "standard" | "uncensored";

export function SettingsModal({
  open, onClose, backend, onBackendChange,
  openrouterKey, onKeyChange, ollamaUrl, onUrlChange,
  selectedModel, onModelChange, onSaveAndReconnect,
}: Props) {
  const [showKey, setShowKey]       = useState(false);
  const [keyDraft, setKeyDraft]     = useState(openrouterKey);
  const [urlDraft, setUrlDraft]     = useState(ollamaUrl);
  const [saved, setSaved]           = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [modelTab, setModelTab]     = useState<ModelTab>("standard");

  if (!open) return null;

  const handleSave = () => {
    onKeyChange(keyDraft.trim());
    onUrlChange(urlDraft.trim());
    onSaveAndReconnect();
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const handleReset = () => {
    if (!confirm("Reset ALL settings to defaults? Clears API key and model choice (not your memories).")) return;
    setResetting(true);
    resetSettings();
    setTimeout(() => window.location.reload(), 400);
  };

  const ModelButton = ({ m, accent = false }: { m: { id: string; name: string; description?: string; context?: number; free?: boolean }; accent?: boolean }) => (
    <button onClick={() => onModelChange(m.id)}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
        selectedModel === m.id
          ? accent
            ? "bg-warning/10 border border-warning/30 text-foreground"
            : "bg-primary/15 border border-primary/30 text-foreground"
          : "bg-secondary/20 border border-transparent hover:border-border/50 text-muted-foreground hover:text-foreground"
      }`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{m.name}</span>
        {selectedModel === m.id && <Check className={`w-3 h-3 flex-shrink-0 ${accent ? "text-warning" : "text-primary"}`} />}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
        {m.description}{(m as any).context ? ` · ${((m as any).context/1000).toFixed(0)}k ctx` : ""}
        {m.free && <span className="ml-1 text-success/70">· free</span>}
      </p>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-sm font-display font-bold text-primary tracking-widest uppercase">Settings</h2>
            <p className="text-[10px] text-muted-foreground font-mono-tech mt-0.5">Backend · Model · API Key</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Step 1 — Backend */}
          <div>
            <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2 block">
              Step 1 — Backend
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "openrouter" as const, label: "OpenRouter", sub: "Cloud · works on Netlify & Android", emoji: "☁️" },
                { id: "ollama"      as const, label: "Ollama",      sub: "Local · fully private · uncensored",  emoji: "💻" },
              ]).map(({ id, label, sub, emoji }) => (
                <button key={id} onClick={() => onBackendChange(id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    backend === id
                      ? "bg-primary/10 border-primary/40 text-foreground"
                      : "bg-secondary/20 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{emoji}</span>
                    <span className="text-xs font-semibold">{label}</span>
                    {backend === id && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 leading-tight">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── OpenRouter ── */}
          {backend === "openrouter" && (
            <div className="space-y-4">

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
                    Step 2 — API Key
                  </label>
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    Get free key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={keyDraft}
                    onChange={e => setKeyDraft(e.target.value)}
                    placeholder="sk-or-v1-...  (leave blank for free models)"
                    className="w-full bg-secondary/50 border border-border/50 focus:border-primary/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-mono-tech pr-10" />
                  <button onClick={() => setShowKey(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Model tabs */}
              <div>
                <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2 block">
                  Step 3 — Model
                </label>
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setModelTab("standard")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-tech transition-all ${
                      modelTab === "standard"
                        ? "bg-primary/15 border border-primary/30 text-primary"
                        : "bg-secondary/20 border border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    <Lock className="w-2.5 h-2.5" /> Standard
                  </button>
                  <button onClick={() => setModelTab("uncensored")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-tech transition-all ${
                      modelTab === "uncensored"
                        ? "bg-warning/15 border border-warning/30 text-warning"
                        : "bg-secondary/20 border border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    <Unlock className="w-2.5 h-2.5" /> Uncensored
                  </button>
                </div>

                {modelTab === "standard" ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        <p className="text-[10px] font-mono-tech text-success/80">Free — no key needed</p>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {OPENROUTER_FREE_MODELS.map(m => <ModelButton key={m.id} m={m} />)}
                      </div>
                    </div>
                    {keyDraft.trim() && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                          <p className="text-[10px] font-mono-tech text-warning/80">Paid — requires credits</p>
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {OPENROUTER_PAID_MODELS.map(m => <ModelButton key={m.id} m={m} accent />)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
                      <p className="text-[10px] text-warning/80 font-mono-tech leading-relaxed">
                        Uncensored models have no content restrictions. They follow LONNIE's operator-bound directives without filtering.
                        For maximum privacy with zero filtering, use Ollama locally instead.
                      </p>
                    </div>
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                      {UNCENSORED_OPENROUTER_MODELS.map(m => <ModelButton key={m.id} m={m} accent />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Ollama ── */}
          {backend === "ollama" && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-1.5 block">
                  Step 2 — Ollama URL
                </label>
                <input type="text" value={urlDraft} onChange={e => setUrlDraft(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-secondary/50 border border-border/50 focus:border-primary/50 rounded-xl px-3 py-2.5 text-sm font-mono-tech text-foreground placeholder:text-muted-foreground/40 outline-none" />
              </div>

              <div className="px-3 py-2.5 rounded-xl bg-success/5 border border-success/20">
                <div className="flex items-start gap-2">
                  <Unlock className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] text-muted-foreground/80 space-y-1.5">
                    <p className="text-success/80 font-semibold">Ollama = fully private + uncensored</p>
                    <p>No content filtering. No data sent anywhere. Runs on your machine.</p>
                    <p>Recommended uncensored models:</p>
                    <code className="block bg-secondary/80 px-2 py-1 rounded text-primary/80 font-mono-tech">
                      ollama pull dolphin-mistral
                    </code>
                    <code className="block bg-secondary/80 px-2 py-1 rounded text-primary/80 font-mono-tech">
                      ollama pull dolphin-llama3
                    </code>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] text-muted-foreground/80 space-y-1.5">
                    <p className="text-warning/80 font-semibold">Windows CORS fix (one time):</p>
                    <p>Win+S → "Edit system environment variables" → Environment Variables → New System Variable:</p>
                    <p>Name: <code className="bg-secondary/80 px-1 rounded text-primary/80">OLLAMA_ORIGINS</code> · Value: <code className="bg-secondary/80 px-1 rounded text-primary/80">*</code></p>
                    <p>Restart computer. After that, just run <code className="bg-secondary/80 px-1 rounded">ollama serve</code> normally.</p>
                  </div>
                </div>
              </div>

              {/* Model tabs for Ollama */}
              <div>
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setModelTab("standard")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-tech transition-all ${
                      modelTab === "standard"
                        ? "bg-primary/15 border border-primary/30 text-primary"
                        : "bg-secondary/20 border border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    <Lock className="w-2.5 h-2.5" /> Standard
                  </button>
                  <button onClick={() => setModelTab("uncensored")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-tech transition-all ${
                      modelTab === "uncensored"
                        ? "bg-success/15 border border-success/30 text-success"
                        : "bg-secondary/20 border border-transparent text-muted-foreground hover:text-foreground"
                    }`}>
                    <Unlock className="w-2.5 h-2.5" /> Uncensored
                  </button>
                </div>

                <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2 block">
                  Step 3 — {modelTab === "uncensored" ? "Uncensored Models (pull first)" : "Installed Models"}
                </label>

                {modelTab === "uncensored" ? (
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {UNCENSORED_OLLAMA_MODELS.map(m => <ModelButton key={m.id} m={m} />)}
                  </div>
                ) : (
                  <OllamaModelManager selectedModel={selectedModel} onModelChange={onModelChange} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/50 flex items-center justify-between flex-shrink-0">
          <button onClick={handleReset} disabled={resetting}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-30">
            <RotateCcw className="w-3 h-3" />
            {resetting ? "Resetting…" : "Reset defaults"}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleSave}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                saved
                  ? "bg-success/20 border border-success/30 text-success"
                  : "bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary"
              }`}>
              {saved ? "✓ Saved" : "Save & Reconnect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
