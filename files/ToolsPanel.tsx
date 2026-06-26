import React from "react";
import { TOOL_REGISTRY, type ToolName } from "@/services/tools";

const CATEGORIES = [
  { id: "system", label: "System", emoji: "💻" },
  { id: "web", label: "Web", emoji: "🌐" },
  { id: "files", label: "Files", emoji: "📁" },
  { id: "memory", label: "Memory", emoji: "🧠" },
  { id: "comms", label: "Comms", emoji: "📡" },
] as const;

interface Props {
  enabledTools: ToolName[];
  onToggle: (tool: ToolName, on: boolean) => void;
  temperature: number;
  onTemperatureChange: (t: number) => void;
  modelName?: string;
}

export function ToolsPanel({ enabledTools, onToggle, temperature, onTemperatureChange, modelName }: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-border/50 flex-shrink-0">
        <h2 className="text-[10px] font-display font-bold text-primary tracking-widest uppercase">Capabilities</h2>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{enabledTools.length} of {TOOL_REGISTRY.length} active</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {CATEGORIES.map((cat) => {
          const tools = TOOL_REGISTRY.filter((t) => t.category === cat.id);
          return (
            <div key={cat.id}>
              <div className="text-[9px] font-mono-tech text-muted-foreground/50 uppercase tracking-widest mb-1 px-1">
                {cat.emoji} {cat.label}
              </div>
              <div className="space-y-0.5">
                {tools.map((tool) => {
                  const on = enabledTools.includes(tool.name);
                  return (
                    <button
                      key={tool.name}
                      onClick={() => onToggle(tool.name, !on)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                        on
                          ? "bg-primary/8 border border-primary/15 text-foreground"
                          : "hover:bg-secondary/40 border border-transparent text-muted-foreground hover:text-foreground/70"
                      }`}
                    >
                      <span className="text-sm flex-shrink-0 w-5 text-center">{tool.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate leading-tight">{tool.label}</div>
                        {tool.requiresGrant && (
                          <div className="text-[9px] text-muted-foreground/50 truncate">requires permission</div>
                        )}
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
          <div className="text-[9px] font-mono-tech text-muted-foreground/50 uppercase tracking-widest mb-1 px-1">
            ⚙️ Model
          </div>
          <div className="px-2 py-2 rounded-lg bg-secondary/20 border border-border/30">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Temperature</span>
              <span className="text-[11px] font-mono-tech text-primary">{temperature.toFixed(1)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05" value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full accent-primary h-1"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-0.5">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>
        </div>

        {/* Memory viewer */}
        <MemoryViewer />
      </div>
    </div>
  );
}

function MemoryViewer() {
  const [open, setOpen] = React.useState(false);
  const mem = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}"); } catch { return {}; }
  }, [open]);
  const keys = Object.keys(mem);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[9px] font-mono-tech text-muted-foreground/50 uppercase tracking-widest mb-1 px-1 w-full text-left hover:text-primary transition-colors"
      >
        🗂️ Memory {keys.length > 0 && `(${keys.length})`} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="px-2 py-1.5 rounded-lg bg-secondary/20 border border-border/30 space-y-1">
          {keys.length === 0
            ? <p className="text-[10px] text-muted-foreground/50">No memories stored</p>
            : keys.map((k) => (
              <div key={k} className="text-[10px]">
                <span className="text-primary/70 font-mono-tech">{k}:</span>{" "}
                <span className="text-foreground/60">{JSON.stringify(mem[k].value).slice(0, 50)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
