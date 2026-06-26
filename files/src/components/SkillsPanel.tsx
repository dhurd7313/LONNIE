import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Upload, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { skills, type Skill } from "@/lib/skills";

export function SkillsPanel() {
  const [allSkills, setAllSkills]   = useState<Skill[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [adding, setAdding]         = useState(false);
  const [addMode, setAddMode]       = useState<"text" | "url">("text");
  const [textInput, setTextInput]   = useState("");
  const [urlInput, setUrlInput]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState("");

  const refresh = useCallback(async () => {
    await skills.load();
    setAllSkills(skills.getAll());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleIngestText = async () => {
    if (!textInput.trim()) return;
    setLoading(true); setStatus("Ingesting skill…");
    try {
      const skill = await skills.ingestFromText(textInput);
      setStatus(`✓ Added: ${skill.name}`);
      setTextInput("");
      setAdding(false);
      refresh();
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally { setLoading(false); }
  };

  const handleIngestUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true); setStatus("Fetching skill from URL…");
    try {
      const skill = await skills.ingestFromUrl(urlInput);
      setStatus(`✓ Added: ${skill.name}`);
      setUrlInput("");
      setAdding(false);
      refresh();
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally { setLoading(false); }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await skills.toggle(id, !current);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    try { await skills.delete(id); refresh(); }
    catch (e: any) { setStatus(`✗ ${e.message}`); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTextInput(text);
    setAddMode("text");
    e.target.value = "";
  };

  const builtInSkills = allSkills.filter(s => s.source === "built-in");
  const userSkills    = allSkills.filter(s => s.source !== "built-in");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-mono-tech text-accent uppercase tracking-widest">Skills</span>
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-0.5">
            {allSkills.filter(s => s.active).length}/{allSkills.length} active
          </p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="w-5 h-5 flex items-center justify-center text-muted-foreground/50 hover:text-accent transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add skill form */}
      {adding && (
        <div className="px-2 py-2 border-b border-border/30 bg-accent/5 flex-shrink-0 space-y-2">
          {/* Mode tabs */}
          <div className="flex gap-1">
            {(["text", "url"] as const).map(mode => (
              <button key={mode} onClick={() => setAddMode(mode)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-mono-tech transition-all ${
                  addMode === mode
                    ? "bg-accent/20 border border-accent/30 text-accent"
                    : "bg-secondary/20 border border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {mode === "text" ? "Paste Text" : "From URL"}
              </button>
            ))}
          </div>

          {addMode === "text" ? (
            <>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={`Paste skill definition here — JSON (LobeHub format) or plain text system prompt.\n\nExample:\n{\n  "meta": { "title": "My Skill" },\n  "config": { "systemRole": "You are..." }\n}`}
                rows={5}
                className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-2 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40 resize-none"
              />
              <div className="flex gap-1.5">
                <label className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground hover:text-foreground cursor-pointer text-[10px] transition-all">
                  <Upload className="w-2.5 h-2.5" />
                  File
                  <input type="file" accept=".json,.txt,.md,.yaml" className="hidden" onChange={handleFileUpload} />
                </label>
                <button onClick={handleIngestText} disabled={loading || !textInput.trim()}
                  className="flex-1 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all">
                  {loading ? "Adding…" : "Add Skill"}
                </button>
                <button onClick={() => setAdding(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary/30 text-muted-foreground text-[10px]">
                  ✕
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://lobehub.com/...  or any direct URL to skill JSON"
                className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-2 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40"
              />
              <p className="text-[9px] text-muted-foreground/40 font-mono-tech">
                Works with LobeHub, GitHub raw URLs, or any JSON skill file URL
              </p>
              <div className="flex gap-1.5">
                <button onClick={handleIngestUrl} disabled={loading || !urlInput.trim()}
                  className="flex-1 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all">
                  {loading ? "Fetching…" : "Fetch & Add"}
                </button>
                <button onClick={() => setAdding(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary/30 text-muted-foreground text-[10px]">
                  ✕
                </button>
              </div>
            </>
          )}

          {status && (
            <p className={`text-[10px] font-mono-tech ${status.startsWith("✓") ? "text-success" : status.startsWith("✗") ? "text-destructive" : "text-muted-foreground"}`}>
              {status}
            </p>
          )}
        </div>
      )}

      {/* Skills list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">

        {/* Built-in skills */}
        <div>
          <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1.5 px-1">
            Built-in
          </p>
          <div className="space-y-1">
            {builtInSkills.map(s => (
              <SkillCard key={s.id} skill={s}
                expanded={expanded === s.id}
                onToggleExpand={() => setExpanded(expanded === s.id ? null : s.id)}
                onToggleActive={() => handleToggle(s.id, s.active)}
                onDelete={null}
              />
            ))}
          </div>
        </div>

        {/* User skills */}
        {userSkills.length > 0 && (
          <div>
            <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1.5 px-1">
              Custom ({userSkills.length})
            </p>
            <div className="space-y-1">
              {userSkills.map(s => (
                <SkillCard key={s.id} skill={s}
                  expanded={expanded === s.id}
                  onToggleExpand={() => setExpanded(expanded === s.id ? null : s.id)}
                  onToggleActive={() => handleToggle(s.id, s.active)}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Help */}
        <div className="px-2 py-2 rounded-xl bg-accent/5 border border-accent/15">
          <p className="text-[9px] font-mono-tech text-muted-foreground/60 leading-relaxed">
            Add skills from{" "}
            <a href="https://lobehub.com/agents" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              LobeHub
            </a>
            {" "}— open a skill, copy its JSON, paste above. Or give LONNIE a URL and she'll fetch it.
          </p>
          <p className="text-[9px] font-mono-tech text-muted-foreground/40 mt-1">
            Trigger by name or phrase in chat.
          </p>
        </div>
      </div>
    </div>
  );
}

function SkillCard({ skill, expanded, onToggleExpand, onToggleActive, onDelete }: {
  skill: Skill;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onDelete: (() => void) | null;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      skill.active ? "border-accent/20 bg-accent/5" : "border-border/30 bg-secondary/10"
    }`}>
      <div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium truncate ${skill.active ? "text-foreground" : "text-muted-foreground/60"}`}>
              {skill.name}
            </span>
            {skill.source === "built-in" && (
              <span className="text-[8px] font-mono-tech text-accent/50 bg-accent/10 px-1 rounded flex-shrink-0">built-in</span>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/50 truncate">{skill.description.slice(0, 60)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onToggleActive(); }}
            className={`transition-colors ${skill.active ? "text-accent" : "text-muted-foreground/30 hover:text-muted-foreground"}`}>
            {skill.active
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
          </button>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground/30" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/30" />}
        </div>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 border-t border-border/20 pt-2 space-y-2">
          <p className="text-[10px] text-foreground/70 leading-relaxed">{skill.description}</p>

          {skill.triggerPhrases.length > 0 && (
            <div>
              <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase mb-1">Triggers</p>
              <div className="flex flex-wrap gap-1">
                {skill.triggerPhrases.map(p => (
                  <span key={p} className="text-[9px] font-mono-tech text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skill.examples && skill.examples.length > 0 && (
            <div>
              <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase mb-1">Examples</p>
              {skill.examples.map(e => (
                <p key={e} className="text-[9px] text-muted-foreground/60">› {e}</p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {skill.source && skill.source !== "built-in" && skill.source.startsWith("http") && (
                <a href={skill.source} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] text-accent/50 hover:text-accent font-mono-tech">
                  <ExternalLink className="w-2 h-2" /> source
                </a>
              )}
              <span className="text-[9px] text-muted-foreground/30 font-mono-tech">v{skill.version}</span>
            </div>
            {onDelete && (
              <button onClick={onDelete}
                className="text-[9px] text-muted-foreground/30 hover:text-destructive font-mono-tech flex items-center gap-1 transition-colors">
                <Trash2 className="w-2.5 h-2.5" /> delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
