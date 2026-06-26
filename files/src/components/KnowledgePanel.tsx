import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Search, Trash2, Star, ExternalLink } from "lucide-react";
import { kb, type KnowledgeEntry } from "@/lib/knowledge";

export function KnowledgePanel() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", sourceUrl: "", category: "General", tags: "" });

  const refresh = useCallback(async () => {
    await kb.load();
    setEntries(query ? kb.search(query) : kb.getAll());
  }, [query]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = async () => {
    if (!form.title || !form.content) return;
    await kb.add({
      title: form.title,
      content: form.content,
      sourceUrl: form.sourceUrl || undefined,
      category: form.category,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
    setForm({ title: "", content: "", sourceUrl: "", category: "General", tags: "" });
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await kb.delete(id);
    refresh();
  };

  const scoreColor = (s: number) =>
    s >= 8 ? "text-success" : s >= 5 ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-mono-tech text-primary uppercase tracking-widest">Knowledge</span>
          </div>
          <p className="text-[9px] text-muted-foreground/50">{entries.length} entries</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-2 py-2 border-b border-border/30 space-y-1.5 flex-shrink-0 bg-secondary/10">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="Title *" className="w-full bg-secondary/50 border border-border/40 rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40" />
          <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
            placeholder="Content *" rows={3}
            className="w-full bg-secondary/50 border border-border/40 rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 resize-none" />
          <input value={form.sourceUrl} onChange={e => setForm(f => ({...f, sourceUrl: e.target.value}))}
            placeholder="Source URL" className="w-full bg-secondary/50 border border-border/40 rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40" />
          <div className="flex gap-1.5">
            <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              placeholder="Category" className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40" />
            <input value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))}
              placeholder="Tags (comma sep)" className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40" />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleAdd} className="flex-1 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/20 text-primary text-[10px] font-mono-tech transition-all">
              Save
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg bg-secondary/30 text-muted-foreground text-[10px] transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border/30 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/40" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search knowledge…"
            className="w-full bg-secondary/30 border border-border/30 rounded-lg pl-6 pr-2 py-1 text-[11px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/30" />
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {entries.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/40 text-center py-4 font-mono-tech">
            {query ? "No matches." : "No knowledge yet. Add entries above."}
          </p>
        ) : entries.map(e => (
          <div key={e.id} className="rounded-xl border border-border/30 bg-secondary/10 overflow-hidden group">
            <div className="flex items-start gap-2 px-2.5 py-2 cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-foreground/90 truncate">{e.title}</p>
                  <span className={`text-[9px] font-mono-tech flex-shrink-0 ${scoreColor(e.score)}`}>
                    <Star className="w-2 h-2 inline mr-0.5" />{e.score}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono-tech text-muted-foreground/50 bg-secondary/50 px-1 rounded">{e.category}</span>
                  {e.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-[9px] font-mono-tech text-primary/40">{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-all flex-shrink-0">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
            {expanded === e.id && (
              <div className="px-2.5 pb-2.5 border-t border-border/20 pt-2">
                <p className="text-[10px] text-foreground/70 leading-relaxed">{e.content.slice(0, 300)}{e.content.length > 300 ? "…" : ""}</p>
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 mt-1.5 text-[9px] text-primary/60 hover:text-primary font-mono-tech">
                    <ExternalLink className="w-2 h-2" /> {e.sourceUrl.slice(0, 40)}…
                  </a>
                )}
                <p className="text-[9px] text-muted-foreground/30 font-mono-tech mt-1">{new Date(e.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
