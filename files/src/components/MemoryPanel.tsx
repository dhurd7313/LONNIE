import React, { useEffect, useState, useCallback } from "react";
import { Trash2, Download, Search, RefreshCw } from "lucide-react";
import { memory, type MemoryEntry } from "@/lib/memory";

export function MemoryPanel() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = query.trim()
        ? await memory.search(query)
        : await memory.getAll();
      setEntries(all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (key: string) => {
    await memory.delete(key);
    load();
  };

  const handleExport = async () => {
    const json = await memory.exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lonnie-memories-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = async () => {
    if (!confirm("Delete ALL memories? This cannot be undone.")) return;
    await memory.clear();
    load();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[10px] font-mono-tech text-muted-foreground/60 uppercase tracking-widest">🧠 Memory</span>
          <span className="ml-1.5 text-[10px] font-mono-tech text-primary/60">({entries.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={load} title="Refresh" className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleExport} title="Export all" className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors">
            <Download className="w-3 h-3" />
          </button>
          {entries.length > 0 && (
            <button onClick={handleClearAll} title="Clear all" className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border/30 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/40" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search memories…"
            className="w-full bg-secondary/30 border border-border/30 rounded-lg pl-6 pr-2 py-1 text-[11px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/30"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {entries.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/40 font-mono-tech px-1 py-2">
            {query ? "No matches." : "No memories yet. Tell LONNIE something to remember."}
          </p>
        ) : (
          entries.map(e => (
            <div key={e.key}
              className="group rounded-lg border border-border/30 bg-secondary/10 hover:border-border/50 transition-all overflow-hidden">
              <div
                className="flex items-start gap-1.5 px-2 py-1.5 cursor-pointer"
                onClick={() => setExpanded(expanded === e.key ? null : e.key)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono-tech text-primary/70 truncate">{e.key}</div>
                  <div className="text-[10px] text-muted-foreground/60 truncate">
                    {JSON.stringify(e.value).slice(0, 50)}
                  </div>
                </div>
                <button
                  onClick={ev => { ev.stopPropagation(); handleDelete(e.key); }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-all flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
              {expanded === e.key && (
                <div className="px-2 pb-1.5 border-t border-border/20 mt-0 pt-1.5">
                  <pre className="text-[9px] font-mono-tech text-foreground/70 whitespace-pre-wrap break-all">
                    {JSON.stringify(e.value, null, 2)}
                  </pre>
                  {e.note && <p className="text-[9px] text-muted-foreground/50 mt-1">Note: {e.note}</p>}
                  {e.tags?.length ? <p className="text-[9px] text-primary/40 mt-0.5">Tags: {e.tags.join(", ")}</p> : null}
                  <p className="text-[9px] text-muted-foreground/30 mt-1">
                    {new Date(e.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Storage info */}
      <div className="px-3 py-1.5 border-t border-border/30 flex-shrink-0">
        <p className="text-[9px] font-mono-tech text-muted-foreground/30">
          Stored in IndexedDB · permanent · private
        </p>
      </div>
    </div>
  );
}
