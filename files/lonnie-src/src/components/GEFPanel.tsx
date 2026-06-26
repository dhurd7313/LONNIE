import React, { useState, useEffect } from "react";
import { Target, Play, Square, Trash2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { gef, type GEFGoal } from "@/lib/gef";

export function GEFPanel() {
  const [goals, setGoals] = useState<GEFGoal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => setGoals(gef.getAll());

  useEffect(() => {
    gef.loadFromMemory().then(refresh);
  }, []);

  const handleCreate = async () => {
    if (!newGoal.trim()) return;
    setLoading(true);
    await gef.createGoal(newGoal.trim());
    setNewGoal("");
    refresh();
    setLoading(false);
  };

  const handleAbort = async (id: string) => {
    await gef.abortGoal(id, "Manually aborted by operator");
    refresh();
  };

  const statusColor: Record<GEFGoal["status"], string> = {
    pending:      "text-muted-foreground",
    active:       "text-primary",
    experimenting:"text-warning",
    executing:    "text-accent",
    complete:     "text-success",
    aborted:      "text-destructive",
  };

  const statusDot: Record<GEFGoal["status"], string> = {
    pending:      "bg-muted-foreground",
    active:       "bg-primary animate-pulse",
    experimenting:"bg-warning animate-pulse",
    executing:    "bg-accent animate-pulse",
    complete:     "bg-success",
    aborted:      "bg-destructive",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Target className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono-tech text-primary uppercase tracking-widest">Goal Execution</span>
        </div>
        <p className="text-[9px] text-muted-foreground/50">9-layer GEF · {goals.filter(g=>g.status==="active").length} active</p>
      </div>

      {/* New goal input */}
      <div className="px-2 py-2 border-b border-border/30 flex-shrink-0">
        <div className="flex gap-1.5">
          <input
            value={newGoal}
            onChange={e => setNewGoal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="New goal…"
            className="flex-1 bg-secondary/30 border border-border/30 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 font-body"
          />
          <button onClick={handleCreate} disabled={loading || !newGoal.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/20 text-primary text-[10px] font-mono-tech disabled:opacity-30 transition-all flex-shrink-0">
            {loading ? "…" : <Zap className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {goals.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/40 text-center py-4 font-mono-tech">
            No goals yet. Add one above.
          </p>
        ) : goals.map(g => (
          <div key={g.id} className="rounded-xl border border-border/30 bg-secondary/10 overflow-hidden">
            <div
              className="flex items-start gap-2 px-2.5 py-2 cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            >
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${statusDot[g.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground/90 leading-snug truncate">{g.normalized}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-mono-tech uppercase ${statusColor[g.status]}`}>{g.status}</span>
                  {g.progress > 0 && <span className="text-[9px] text-muted-foreground/40">{g.progress}%</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {(g.status === "active" || g.status === "executing") && (
                  <button onClick={e => { e.stopPropagation(); handleAbort(g.id); }}
                    className="w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors">
                    <Square className="w-2.5 h-2.5" />
                  </button>
                )}
                {expanded === g.id ? <ChevronUp className="w-3 h-3 text-muted-foreground/40" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/40" />}
              </div>
            </div>

            {/* Progress bar */}
            {g.progress > 0 && g.status !== "complete" && (
              <div className="mx-2.5 mb-1.5">
                <div className="h-0.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            )}

            {/* Expanded detail */}
            {expanded === g.id && (
              <div className="px-2.5 pb-2.5 border-t border-border/20 pt-2 space-y-2">
                {g.strategy && (
                  <div>
                    <p className="text-[9px] font-mono-tech text-muted-foreground/50 uppercase mb-1">Strategy</p>
                    <p className="text-[10px] text-foreground/70">▸ {g.strategy.primary}</p>
                    <p className="text-[10px] text-muted-foreground/40">↩ {g.strategy.backup}</p>
                    {g.strategy.tools.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {g.strategy.tools.map(t => (
                          <span key={t} className="text-[9px] font-mono-tech text-primary/50 bg-primary/10 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {g.opportunities.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono-tech text-muted-foreground/50 uppercase mb-1">Opportunities</p>
                    {g.opportunities.slice(0, 2).map(o => (
                      <div key={o.id} className="flex justify-between text-[9px] text-muted-foreground/60 font-mono-tech">
                        <span className="truncate flex-1">{o.description}</span>
                        <span className="text-primary/60 ml-2">score: {o.score}</span>
                      </div>
                    ))}
                  </div>
                )}
                {g.result && (
                  <div>
                    <p className="text-[9px] font-mono-tech text-success/60 uppercase mb-1">Result</p>
                    <p className="text-[10px] text-foreground/70">{g.result}</p>
                  </div>
                )}
                {g.abortReason && (
                  <p className="text-[10px] text-destructive/60">{g.abortReason}</p>
                )}
                <p className="text-[9px] text-muted-foreground/30 font-mono-tech">
                  {new Date(g.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
