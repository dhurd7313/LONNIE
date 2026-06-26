import React, { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Monitor, Container, FolderOpen, Cpu, RefreshCw, Play, Square, Download, GitBranch, Search, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { agent, type AgentStatus } from "@/lib/localAgent";

type AgentTab = "terminal" | "docker" | "git" | "hf" | "files" | "system";

interface Props {
  onScreenshot?: (base64: string) => void;
  onResult?: (text: string) => void;
}

export function AgentPanel({ onScreenshot, onResult }: Props) {
  const [status, setStatus]         = useState<AgentStatus>({ connected: false });
  const [checking, setChecking]     = useState(false);
  const [tab, setTab]               = useState<AgentTab>("terminal");
  const [agentUrl, setAgentUrl]     = useState(agent.url);
  const [agentToken, setAgentToken] = useState(agent.token);
  const [configuring, setConfiguring] = useState(!agent.token);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    const s = await agent.ping();
    setStatus(s);
    setChecking(false);
  }, []);

  useEffect(() => { if (agent.token) checkConnection(); }, [checkConnection]);

  const handleConfigure = () => {
    agent.configure(agentUrl, agentToken);
    setConfiguring(false);
    checkConnection();
  };

  if (configuring || !status.connected) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-mono-tech text-accent uppercase tracking-widest">Desktop Agent</span>
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-0.5">Git · HuggingFace · Docker · Terminal</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {!configuring && status.error && (
            <div className="px-2.5 py-2 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-[10px] text-destructive/80 font-mono-tech">Not connected</p>
              <p className="text-[9px] text-muted-foreground/40 mt-0.5">{status.error}</p>
            </div>
          )}
          <div className="text-[10px] font-mono-tech text-muted-foreground/70 space-y-1.5">
            <p className="text-accent/80 font-semibold">Setup:</p>
            <p><span className="text-primary">1.</span> Extract <code className="bg-secondary/50 px-1 rounded">lonnie-agent.zip</code></p>
            <p><span className="text-primary">2.</span> Run <code className="bg-secondary/50 px-1 rounded">START-LONNIE-AGENT.ps1</code></p>
            <p><span className="text-primary">3.</span> Copy the token shown</p>
            <p><span className="text-primary">4.</span> Paste below → Connect</p>
          </div>
          <div className="space-y-1.5">
            <input value={agentUrl} onChange={e => setAgentUrl(e.target.value)}
              placeholder="http://localhost:45678"
              className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40" />
            <input value={agentToken} onChange={e => setAgentToken(e.target.value)}
              placeholder="lonnie-xxxxxxxx token" type="password"
              className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40" />
            <button onClick={handleConfigure} disabled={!agentToken.trim() || checking}
              className="w-full py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all">
              {checking ? "Connecting…" : "Connect Agent"}
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground/40 font-mono-tech space-y-0.5">
            <p>Capabilities when connected:</p>
            <p>• Clone any GitHub/GitLab repo</p>
            <p>• Search & download HuggingFace models</p>
            <p>• Docker: run, build, compose, manage containers</p>
            <p>• Full desktop screenshot</p>
            <p>• Read/write any file on your machine</p>
            <p>• Run any terminal command</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-mono-tech text-success">Agent Online</span>
          {status.latencyMs && <span className="text-[9px] text-muted-foreground/40 font-mono-tech">{status.latencyMs}ms</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={checkConnection} className="text-muted-foreground/30 hover:text-primary transition-colors">
            <RefreshCw className={`w-2.5 h-2.5 ${checking ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setConfiguring(true)} className="text-[9px] font-mono-tech text-muted-foreground/30 hover:text-primary transition-colors">cfg</button>
        </div>
      </div>
      <div className="px-2.5 py-0.5 border-b border-border/20 flex-shrink-0">
        <p className="text-[9px] font-mono-tech text-muted-foreground/30">{status.user}@{status.hostname}</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-6 border-b border-border/40 flex-shrink-0">
        {([
          { id: "terminal" as AgentTab, icon: Terminal,   label: "Shell" },
          { id: "docker"   as AgentTab, icon: Container,  label: "Docker" },
          { id: "git"      as AgentTab, icon: GitBranch,  label: "Git" },
          { id: "hf"       as AgentTab, icon: Download,   label: "HF" },
          { id: "files"    as AgentTab, icon: FolderOpen, label: "Files" },
          { id: "system"   as AgentTab, icon: Cpu,        label: "Sys" },
        ]).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`py-1.5 flex flex-col items-center gap-0.5 border-b-2 transition-colors ${
              tab === id ? "text-accent border-accent" : "text-muted-foreground/30 border-transparent hover:text-muted-foreground"
            }`}>
            <Icon className="w-2.5 h-2.5" />
            <span className="text-[7px] font-mono-tech">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "terminal" && <TerminalTab />}
        {tab === "docker"   && <DockerTab />}
        {tab === "git"      && <GitTab />}
        {tab === "hf"       && <HuggingFaceTab />}
        {tab === "files"    && <FilesTab />}
        {tab === "system"   && <SystemTab onScreenshot={onScreenshot} />}
      </div>
    </div>
  );
}

// ── Terminal ───────────────────────────────────────────────────────────────────
function TerminalTab() {
  const [history, setHistory] = useState<{ cmd: string; out: string; ok: boolean }[]>([]);
  const [input, setInput]     = useState("");
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const run = async (cmd?: string) => {
    const c = cmd ?? input.trim();
    if (!c || running) return;
    setInput("");
    setRunning(true);
    try {
      const r = await agent.exec(c);
      setHistory(h => [...h, { cmd: c, out: r.combined || r.error || "(no output)", ok: r.ok }]);
    } catch (e: any) {
      setHistory(h => [...h, { cmd: c, out: `Error: ${e.message}`, ok: false }]);
    } finally { setRunning(false); }
  };

  const quick = ["docker ps", "docker ps -a", "git --version", "python --version", "node --version", "dir", "ls", "whoami"];

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-1.5 flex gap-1 flex-wrap flex-shrink-0 border-b border-border/20 pb-1.5">
        {quick.map(c => (
          <button key={c} onClick={() => run(c)}
            className="text-[8px] font-mono-tech text-muted-foreground/40 bg-secondary/20 hover:bg-secondary/50 hover:text-primary px-1.5 py-0.5 rounded transition-all">
            {c}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 font-mono-tech">
        {history.length === 0 && <p className="text-[9px] text-muted-foreground/25 italic">Ready. Run any command.</p>}
        {history.map((h, i) => (
          <div key={i}>
            <p className="text-[10px] text-accent/60">$ {h.cmd}</p>
            <pre className={`text-[9px] whitespace-pre-wrap break-all leading-relaxed max-h-32 overflow-y-auto ${h.ok ? "text-foreground/60" : "text-destructive/60"}`}>
              {h.out.slice(0, 2000)}{h.out.length > 2000 ? "\n…" : ""}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-2 py-1.5 border-t border-border/30 flex gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono-tech text-accent/40 pt-1 flex-shrink-0">$</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && run()} disabled={running}
          placeholder="command…"
          className="flex-1 bg-transparent text-[10px] font-mono-tech text-foreground outline-none placeholder:text-muted-foreground/25 disabled:opacity-40" />
        <button onClick={() => run()} disabled={!input.trim() || running}
          className="text-accent/50 hover:text-accent disabled:opacity-20 transition-colors">
          <Play className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Docker ─────────────────────────────────────────────────────────────────────
function DockerTab() {
  const [containers, setContainers] = useState<any[]>([]);
  const [images, setImages]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [output, setOutput]         = useState("");
  const [error, setError]           = useState("");
  const [view, setView]             = useState<"containers" | "images" | "run">("containers");
  const [runImage, setRunImage]     = useState("");
  const [runName, setRunName]       = useState("");
  const [runPorts, setRunPorts]     = useState("");

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [cr, ir] = await Promise.all([agent.dockerPs(), agent.dockerImages()]);
      if (cr.ok) setContainers(cr.containers || []);
      else setError(cr.error || "Docker unavailable");
      if (ir.ok) setImages(ir.images || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const action = async (act: string, name: string) => {
    setOutput(`${act} ${name}…`);
    const r = await agent.dockerAction(act, name);
    setOutput(r.output || r.error || "Done.");
    if (["start","stop","restart","rm"].includes(act)) refresh();
  };

  const doRun = async () => {
    if (!runImage) return;
    setOutput(`Starting ${runImage}…`);
    const ports = runPorts ? runPorts.split(",").map(p => p.trim()) : [];
    const r = await agent.dockerRun(runImage, { name: runName || undefined, ports });
    setOutput(r.output || r.error || "Done.");
    refresh();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1 border-b border-border/20 flex items-center gap-1 flex-shrink-0">
        {(["containers","images","run"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`text-[9px] font-mono-tech px-2 py-0.5 rounded transition-all ${view === v ? "bg-accent/20 text-accent" : "text-muted-foreground/40 hover:text-foreground"}`}>
            {v}
          </button>
        ))}
        <button onClick={refresh} className="ml-auto text-muted-foreground/30 hover:text-primary transition-colors">
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="text-[9px] text-destructive/60 font-mono-tech px-2 py-1">{error}</p>}

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {view === "containers" && containers.map((c, i) => (
          <div key={i} className="rounded-lg border border-border/30 bg-secondary/10 px-2 py-1.5">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className={`text-[10px] font-mono-tech font-medium truncate ${c.State === "running" ? "text-success" : "text-muted-foreground/60"}`}>
                  {(c.Names ?? c.ID ?? "").replace(/^\//, "")}
                </p>
                <p className="text-[9px] text-muted-foreground/40 truncate">{c.Image}</p>
                <p className="text-[9px] text-muted-foreground/30 truncate">{c.Status}</p>
              </div>
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                {c.State !== "running"
                  ? <button onClick={() => action("start", (c.Names ?? c.ID).replace(/^\//, ""))} className="text-[8px] font-mono-tech text-success/60 hover:text-success bg-success/10 px-1.5 py-0.5 rounded">start</button>
                  : <button onClick={() => action("stop",  (c.Names ?? c.ID).replace(/^\//, ""))} className="text-[8px] font-mono-tech text-destructive/60 hover:text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">stop</button>
                }
                <button onClick={() => action("logs", (c.Names ?? c.ID).replace(/^\//, ""))} className="text-[8px] font-mono-tech text-primary/60 hover:text-primary bg-primary/10 px-1.5 py-0.5 rounded">logs</button>
              </div>
            </div>
          </div>
        ))}

        {view === "images" && images.map((img, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg border border-border/20 bg-secondary/10">
            <div className="min-w-0">
              <p className="text-[10px] font-mono-tech text-foreground/70 truncate">{img.Repository}:{img.Tag}</p>
              <p className="text-[9px] text-muted-foreground/40">{img.Size} · {img.CreatedSince}</p>
            </div>
          </div>
        ))}

        {view === "run" && (
          <div className="space-y-1.5 pt-1">
            <input value={runImage} onChange={e => setRunImage(e.target.value)} placeholder="Image (e.g. nginx:latest)"
              className="w-full bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40" />
            <input value={runName} onChange={e => setRunName(e.target.value)} placeholder="Name (optional)"
              className="w-full bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none" />
            <input value={runPorts} onChange={e => setRunPorts(e.target.value)} placeholder="Ports: 8080:80, 3000:3000"
              className="w-full bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none" />
            <button onClick={doRun} disabled={!runImage}
              className="w-full py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all">
              Run Container
            </button>
          </div>
        )}
      </div>

      {output && (
        <div className="px-2 py-1.5 border-t border-border/20 flex-shrink-0">
          <pre className="text-[9px] font-mono-tech text-foreground/50 max-h-20 overflow-y-auto whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

// ── Git ────────────────────────────────────────────────────────────────────────
function GitTab() {
  const [url, setUrl]     = useState("");
  const [dest, setDest]   = useState("");
  const [branch, setBranch] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const doClone = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setOutput("Cloning…");
    try {
      const r = await agent.gitClone(url.trim(), dest.trim() || undefined, branch.trim() || undefined);
      if (r.ok) {
        let msg = `✓ Cloned to: ${r.path}\n`;
        if (r.detected?.hasDockerCompose) msg += "📦 docker-compose.yml found\n";
        if (r.detected?.hasDockerfile)    msg += "🐳 Dockerfile found\n";
        if (r.detected?.hasPackageJson)   msg += "📦 package.json found\n";
        if (r.detected?.hasRequirements)  msg += "🐍 requirements.txt found\n";
        msg += `\nFiles: ${r.files?.slice(0, 10).join(", ")}`;
        setOutput(msg);
      } else {
        setOutput(`Failed: ${r.error || r.combined}`);
      }
    } catch (e: any) { setOutput(`Error: ${e.message}`); }
    setLoading(false);
  };

  const popular = [
    "https://github.com/obra/superpowers",
    "https://github.com/ollama/ollama",
    "https://github.com/AUTOMATIC1111/stable-diffusion-webui",
    "https://github.com/oobabooga/text-generation-webui",
    "https://github.com/ComfyUI/ComfyUI",
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-2 space-y-2">
      <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest">Clone Repository</p>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/user/repo"
        className="w-full bg-secondary/40 border border-border/30 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40" />
      <div className="flex gap-1.5">
        <input value={dest} onChange={e => setDest(e.target.value)} placeholder="Dest path (optional)"
          className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none" />
        <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Branch"
          className="w-24 bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none" />
      </div>
      <button onClick={doClone} disabled={!url.trim() || loading}
        className="w-full py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all flex items-center justify-center gap-1.5">
        <GitBranch className="w-3 h-3" />
        {loading ? "Cloning…" : "Clone"}
      </button>

      <p className="text-[9px] font-mono-tech text-muted-foreground/30 uppercase tracking-widest pt-1">Popular Repos</p>
      {popular.map(repo => (
        <button key={repo} onClick={() => setUrl(repo)}
          className="text-left text-[9px] font-mono-tech text-muted-foreground/50 hover:text-primary transition-colors truncate">
          › {repo.replace("https://github.com/", "")}
        </button>
      ))}

      {output && (
        <div className="mt-2 p-2 rounded-lg bg-secondary/20 border border-border/20">
          <pre className="text-[9px] font-mono-tech text-foreground/60 whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

// ── HuggingFace ────────────────────────────────────────────────────────────────
function HuggingFaceTab() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dlModel, setDlModel] = useState("");
  const [dlFile, setDlFile]   = useState("");
  const [dlOutput, setDlOutput] = useState("");
  const [info, setInfo]       = useState<any>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await agent.hfSearch(query.trim(), 8);
      setResults(r.results || []);
    } catch (e: any) { setResults([]); }
    setLoading(false);
  };

  const getInfo = async (modelId: string) => {
    setDlModel(modelId);
    const r = await agent.hfModelInfo(modelId);
    if (r.ok) setInfo(r);
  };

  const download = async () => {
    if (!dlModel) return;
    setDlOutput("Starting download…");
    try {
      const r = await agent.hfDownload(dlModel, dlFile || undefined);
      setDlOutput(r.ok ? `✓ Downloaded to: ${r.path}` : `Failed: ${r.error || r.combined}`);
    } catch (e: any) { setDlOutput(`Error: ${e.message}`); }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-2 space-y-2">
      <div className="flex gap-1.5">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Search models (e.g. llama, phi, mistral)"
          className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40" />
        <button onClick={search} disabled={loading}
          className="px-2 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] disabled:opacity-30 transition-all">
          {loading ? "…" : <Search className="w-3 h-3" />}
        </button>
      </div>

      {results.map(m => (
        <div key={m.id} className="rounded-lg border border-border/20 bg-secondary/10 px-2 py-1.5 cursor-pointer hover:border-accent/30 transition-colors"
          onClick={() => getInfo(m.id)}>
          <p className="text-[10px] font-mono-tech text-foreground/80 truncate">{m.id}</p>
          <div className="flex gap-2 text-[9px] text-muted-foreground/40 font-mono-tech">
            <span>{m.pipeline || "—"}</span>
            <span>↓{(m.downloads/1000).toFixed(0)}k</span>
            <span>❤{m.likes}</span>
          </div>
        </div>
      ))}

      {info && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-2 space-y-1.5">
          <p className="text-[10px] font-mono-tech text-accent">{info.id}</p>
          <p className="text-[9px] text-muted-foreground/60">{info.pipeline} · ↓{(info.downloads/1000).toFixed(0)}k · ❤{info.likes}</p>
          {info.files?.slice(0, 6).map((f: any) => (
            <button key={f.name} onClick={() => setDlFile(f.name)}
              className={`block text-left w-full text-[9px] font-mono-tech transition-colors ${dlFile === f.name ? "text-accent" : "text-muted-foreground/50 hover:text-foreground"}`}>
              › {f.name} {f.size ? `(${(f.size/1024/1024).toFixed(0)}MB)` : ""}
            </button>
          ))}
        </div>
      )}

      {dlModel && (
        <div className="space-y-1.5">
          <input value={dlFile} onChange={e => setDlFile(e.target.value)} placeholder="File (blank = full repo)"
            className="w-full bg-secondary/40 border border-border/30 rounded-lg px-2 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none" />
          <button onClick={download}
            className="w-full py-1.5 rounded-lg bg-success/10 hover:bg-success/20 border border-success/20 text-success text-[10px] font-mono-tech transition-all flex items-center justify-center gap-1.5">
            <Download className="w-3 h-3" /> Download {dlModel}
          </button>
          {dlOutput && <pre className="text-[9px] font-mono-tech text-foreground/50 whitespace-pre-wrap">{dlOutput}</pre>}
        </div>
      )}
    </div>
  );
}

// ── Files ──────────────────────────────────────────────────────────────────────
function FilesTab() {
  const [pathInput, setPathInput] = useState("");
  const [entries, setEntries]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [pathStack, setPathStack] = useState<string[]>([]);

  const browse = async (p: string) => {
    setLoading(true); setError("");
    try {
      const r = await agent.listDir(p);
      if (r.ok) { setEntries(r.entries || []); setPathStack(prev => [...prev, p]); setPathInput(p); }
      else setError(r.error);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const goBack = () => {
    if (pathStack.length < 2) return;
    const newStack = pathStack.slice(0, -1);
    setPathStack(newStack);
    browse(newStack[newStack.length - 1]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-border/20 flex gap-1.5 flex-shrink-0">
        {pathStack.length > 1 && (
          <button onClick={goBack} className="text-[10px] font-mono-tech text-muted-foreground/50 hover:text-primary px-1.5 py-0.5 rounded bg-secondary/30 transition-all">←</button>
        )}
        <input value={pathInput} onChange={e => setPathInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && browse(pathInput)}
          placeholder="Path or press Go"
          className="flex-1 bg-secondary/30 border border-border/20 rounded px-2 py-0.5 text-[9px] font-mono-tech text-foreground placeholder:text-muted-foreground/25 outline-none" />
        <button onClick={() => browse(pathInput || "~")} disabled={loading}
          className="text-[9px] font-mono-tech text-primary/60 hover:text-primary px-1.5 py-0.5 rounded bg-primary/10 transition-all disabled:opacity-30">
          {loading ? "…" : "Go"}
        </button>
      </div>
      {error && <p className="text-[9px] text-destructive/60 font-mono-tech px-2 py-1">{error}</p>}
      <div className="flex-1 overflow-y-auto">
        {entries.map(e => (
          <div key={e.path}
            className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-secondary/20 cursor-pointer transition-colors"
            onClick={() => e.type === "dir" && browse(e.path)}>
            <span className="text-xs">{e.type === "dir" ? "📁" : "📄"}</span>
            <span className="text-[10px] font-mono-tech text-foreground/60 truncate flex-1">{e.name}</span>
            {e.type === "file" && <span className="text-[8px] text-muted-foreground/25">{(e.size/1024).toFixed(0)}K</span>}
          </div>
        ))}
        {entries.length === 0 && !loading && !error && (
          <p className="text-[9px] text-muted-foreground/25 font-mono-tech px-2.5 py-2">Enter a path and press Go</p>
        )}
      </div>
    </div>
  );
}

// ── System ─────────────────────────────────────────────────────────────────────
function SystemTab({ onScreenshot }: { onScreenshot?: (base64: string) => void }) {
  const [info, setInfo]       = useState<any>(null);
  const [ssLoading, setSsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchInfo = async () => {
    setLoading(true);
    try { setInfo(await agent.getSystemInfo()); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchInfo(); }, []);

  const takeScreenshot = async () => {
    setSsLoading(true);
    const ss = await agent.screenshot();
    if (ss && onScreenshot) onScreenshot(ss.base64);
    else if (!ss) alert("Screenshot failed — check agent window");
    setSsLoading(false);
  };

  return (
    <div className="overflow-y-auto h-full px-3 py-2 space-y-2">
      <button onClick={takeScreenshot} disabled={ssLoading}
        className="w-full py-2 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-mono-tech flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all">
        <Monitor className="w-3 h-3" />
        {ssLoading ? "Capturing…" : "Full Desktop Screenshot"}
      </button>

      {info && (
        <div className="space-y-0.5">
          {[
            ["Platform", `${info.platform} ${info.arch}`],
            ["User", `${info.user}@${info.hostname}`],
            ["CPU", `${info.cpuCores}× ${info.cpuModel?.slice(0, 30)}`],
            ["RAM", `${info.memFreeGB}GB free / ${info.memTotalGB}GB (${info.memUsedPct}% used)`],
            ["Node", info.nodeVersion],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[9px] font-mono-tech py-0.5 border-b border-border/15">
              <span className="text-muted-foreground/40">{k}</span>
              <span className="text-foreground/60 truncate max-w-[120px] text-right">{v}</span>
            </div>
          ))}
          <div className="pt-1">
            <p className="text-[9px] font-mono-tech text-muted-foreground/30 mb-0.5">Installed tools:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(info.tools ?? {}).map(([k, v]) => (
                <span key={k} className={`text-[8px] font-mono-tech px-1.5 py-0.5 rounded ${v ? "text-success/70 bg-success/10" : "text-muted-foreground/25 bg-secondary/20"}`}>
                  {v ? "✓" : "✗"} {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <button onClick={fetchInfo} disabled={loading}
        className="w-full py-1 rounded bg-secondary/20 text-muted-foreground/30 hover:text-foreground text-[9px] font-mono-tech flex items-center justify-center gap-1 transition-all">
        <RefreshCw className={`w-2 h-2 ${loading ? "animate-spin" : ""}`} /> Refresh
      </button>
    </div>
  );
}
