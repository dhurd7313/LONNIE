import React, { useState } from "react";
import { TOOL_REGISTRY, type ToolName } from "@/services/tools";
import { MemoryPanel } from "./MemoryPanel";
import { GEFPanel } from "./GEFPanel";
import { KnowledgePanel } from "./KnowledgePanel";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { SkillsPanel } from "./SkillsPanel";
import { AgentPanel } from "./AgentPanel";

const TOOL_CATEGORIES = [
  { id: "system", label: "System",  emoji: "💻" },
  { id: "web",    label: "Web",     emoji: "🌐" },
  { id: "files",  label: "Files",   emoji: "📁" },
  { id: "memory", label: "Memory",  emoji: "🧠" },
  { id: "comms",  label: "Comms",   emoji: "📡" },
] as const;

type Tab = "tools" | "skills" | "memory" | "gef" | "knowledge" | "diag" | "agent";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "tools",     label: "Tools",   emoji: "⚙" },
  { id: "skills",    label: "Skills",  emoji: "✦" },
  { id: "memory",    label: "Mem",     emoji: "🧠" },
  { id: "gef",       label: "GEF",     emoji: "🎯" },
  { id: "knowledge", label: "Know",    emoji: "📚" },
  { id: "diag",      label: "Diag",    emoji: "📊" },
  { id: "agent",     label: "Agent",   emoji: "⚡" },
];

interface Props {
  enabledTools: ToolName[];
  onToggle: (tool: ToolName, on: boolean) => void;
  temperature: number;
  onTemperatureChange: (t: number) => void;
}

export function ToolsPanel({ enabledTools, onToggle, temperature, onTemperatureChange }: Props) {
  const [tab, setTab] = useState<Tab>("tools");

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar — two rows for 6 tabs */}
      <div className="grid grid-cols-3 border-b border-border/50 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-1.5 flex flex-col items-center gap-0.5 transition-colors border-b-2 ${
              tab === t.id
                ? "text-primary border-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground border-transparent"
            }`}>
            <span className="text-xs">{t.emoji}</span>
            <span className="text-[8px] font-mono-tech uppercase tracking-wider">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "skills"    && <SkillsPanel />}
        {tab === "memory"    && <MemoryPanel />}
        {tab === "gef"       && <GEFPanel />}
        {tab === "knowledge" && <KnowledgePanel />}
        {tab === "diag"      && <DiagnosticsPanel />}
        {tab === "agent"     && <AgentPanel />}
        {tab === "tools"     && (
          <div className="h-full overflow-y-auto px-2 py-2 space-y-3">
            {TOOL_CATEGORIES.map(cat => {
              const tools = TOOL_REGISTRY.filter(t => t.category === cat.id);
              if (!tools.length) return null;
              return (
                <div key={cat.id}>
                  <div className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1 px-1">
                    {cat.emoji} {cat.label}
                  </div>
                  <div className="space-y-0.5">
                    {tools.map(tool => {
                      const on = enabledTools.includes(tool.name);
                      return (
                        <button key={tool.name} onClick={() => onToggle(tool.name, !on)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                            on ? "bg-primary/8 border border-primary/15 text-foreground"
                               : "hover:bg-secondary/40 border border-transparent text-muted-foreground hover:text-foreground/70"
                          }`}>
                          <span className="text-sm w-5 text-center flex-shrink-0">{tool.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium truncate leading-tight">{tool.label}</div>
                            {tool.requiresGrant && <div className="text-[9px] text-muted-foreground/40">needs permission</div>}
                          </div>
                          <div className={`w-6 h-3.5 rounded-full relative transition-colors flex-shrink-0 ${on ? "bg-primary" : "bg-muted"}`}>
                            <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-2.5" : "translate-x-0.5"}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Temperature */}
            <div>
              <div className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1 px-1">⚙ Model</div>
              <div className="px-2 py-2 rounded-lg bg-secondary/20 border border-border/30">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">Temperature</span>
                  <span className="text-[11px] font-mono-tech text-primary">{temperature.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={temperature}
                  onChange={e => onTemperatureChange(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1" />
                <div className="flex justify-between text-[9px] text-muted-foreground/30 mt-0.5">
                  <span>Precise</span><span>Creative</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
