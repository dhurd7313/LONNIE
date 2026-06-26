import React, { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Monitor, Container, FolderOpen, Cpu, RefreshCw, Play, Square, Zap } from "lucide-react";
import { agent, type AgentStatus, type DockerContainer } from "@/lib/localAgent";

type AgentTab = "terminal" | "docker" | "system" | "files";

interface Props {
  onScreenshot?: (base64: string) => void;
}

export function AgentPanel({ onScreenshot }: Props) {
  const [status, setStatus]           = useState<AgentStatus>({ connected: false });
  const [checking, setChecking]       = useState(false);
  const [tab, setTab]                 = useState<AgentTab>("terminal");
  const [agentUrl, setAgentUrl]       = useState(agent.url);
  const [agentToken, setAgentToken]   = useState(agent.token);
  const [configuring, setConfiguring] = useState(!agent.token);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    const s = await agent.ping();
    setStatus(s);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (agent.token) checkConnection();
  }, [checkConnection]);

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
          <p className="text-[9px] text-muted-foreground/50 mt-0.5">Real terminal · Docker · Screenshots</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {/* Status */}
          {!configuring && (
            <div className="px-3 py-2 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-[10px] text-destructive/80 font-mono-tech">
                Agent not running
              </p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                {status.error || "Start lonnie-agent on your machine first"}
              </p>
            </div>
          )}

          {/* Setup instructions */}
          <div className="space-y-1.5 text-[10px] font-mono-tech text-muted-foreground/70">
            <p className="text-accent/80 font-semibold">Setup (one time):</p>
            <p><span className="text-primary">1.</span> Extract lonnie-agent.zip anywhere</p>
            <p><span className="text-primary">2.</span> Double-click START-LONNIE-AGENT.ps1</p>
            <p><span className="text-primary">3.</span> Copy the token shown in the window</p>
            <p><span className="text-primary">4.</span> Paste it below and click Connect</p>
          </div>

          {/* Config form */}
          <div className="space-y-1.5">
            <input
              value={agentUrl}
              onChange={e => setAgentUrl(e.target.value)}
              placeholder="http://localhost:45678"
              className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40"
            />
            <input
              value={agentToken}
              onChange={e => setAgentToken(e.target.value)}
              placeholder="Paste auth token here"
              type="password"
              className="w-full bg-secondary/40 border border-border/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/40"
            />
            <button
              onClick={handleConfigure}
              disabled={!agentToken.trim() || checking}
              className="w-full py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/20 text-accent text-[10px] font-mono-tech disabled:opacity-30 transition-all"
            >
              {checking ? "Connecting…" : "Connect Agent"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-mono-tech text-success">Agent Online</span>
          {status.latencyMs && <span className="text-[9px] text-muted-foreground/40 font-mono-tech">{status.latencyMs}ms</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={checkConnection} title="Refresh"
            className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-primary transition-colors">
            <RefreshCw className={`w-2.5 h-2.5 ${checking ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setConfiguring(true)} title="Reconfigure"
            className="text-[9px] font-mono-tech text-muted-foreground/30 hover:text-primary transition-colors">
            cfg
          </button>
        </div>
      </div>

      {/* System info pill */}
      <div className="px-2.5 py-1 border-b border-border/30 flex-shrink-0">
        <p className="text-[9px] font-mono-tech text-muted-foreground/40">
          {status.user}@{status.hostname} · {status.platform}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 border-b border-border/40 flex-shrink-0">
        {([
          { id: "terminal" as AgentTab, icon: Terminal,   label: "Shell" },
          { id: "docker"   as AgentTab, icon: Container,  label: "Docker" },
          { id: "files"    as AgentTab, icon: FolderOpen, label: "Files" },
          { id: "system"   as AgentTab, icon: Cpu,        label: "Sys" },
        ]).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`py-1.5 flex flex-col items-center gap-0.5 transition-colors border-b-2 ${
              tab === id ? "text-accent border-accent" : "text-muted-foreground/30 border-transparent hover:text-muted-foreground"
            }`}>
            <Icon className="w-2.5 h-2.5" />
            <span className="text-[8px] font-mono-tech">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "terminal"  && <TerminalTab />}
        {tab === "docker"    && <DockerTab />}
        {tab === "files"     && <FilesTab />}
        {tab === "system"    && <SystemTab onScreenshot={onScreenshot} />}
      </div>
    </div>
  );
}

// ── Terminal tab ───────────────────────────────────────────────────────────────
function TerminalTab() {
  const [history, setHistory] = useState<{ cmd: string; out: string; ok: boolean }[]>([]);
  const [input, setInput]     = useState("");
  const [running, setRunning] = useState(false);
  const [cwd, setCwd]         = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const run = async () => {
    if (!input.trim() || running) return;
    const cmd = input.trim();
    setInput("");
    setRunning(true);
    try {
      const result = await agent.exec(cmd, cwd || undefined);
      setHistory(h => [...h, { cmd, out: result.combined || result.error || "(no output)", ok: result.ok }]);
      // Try to detect new cwd from cd commands
      if (cmd.toLowerCase().startsWith("cd ") && result.ok) {
        const newCwd = cmd.slice(3).trim();
        setCwd(newCwd);
      }
    } catch (e: any) {
      setHistory(h => [...h, { cmd, out: `Error: ${e.message}`, ok: false }]);
    } finally {
      setRunning(false);
    }
  };

  const quickCmds = ["docker ps", "docker ps -a", "ls", "dir", "pwd", "whoami", "ipconfig"];

  return (
    <div className="flex flex-col h-full">
      {/* Quick commands */}
      <div className="px-2 pt-1.5 flex gap-1 flex-wrap flex-shrink-0">
        {quickCmds.map(c => (
          <button key={c} onClick={() => setInput(c)}
            className="text-[9px] font-mono-tech text-muted-foreground/50 bg-secondary/30 hover:bg-secondary/60 hover:text-primary px-1.5 py-0.5 rounded transition-all">
            {c}
          </button>
        ))}
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 font-mono-tech">
        {history.length === 0 && (
          <p className="text-[9px] text-muted-foreground/30 italic">Terminal ready. Run any command.</p>
        )}
        {history.map((h, i) => (
          <div key={i}>
            <p className="text-[10px] text-accent/70">$ {h.cmd}</p>
            <pre className={`text-[9px] whitespace-pre-wrap break-all leading-relaxed ${h.ok ? "text-foreground/70" : "text-destructive/70"}`}>
              {h.out.slice(0, 3000)}{h.out.length > 3000 ? "\n…(truncated)" : ""}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t border-border/30 flex gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono-tech text-accent/50 pt-1.5 flex-shrink-0">$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && run()}
          disabled={running}
          placeholder="Enter command…"
          className="flex-1 bg-transparent text-[10px] font-mono-tech text-foreground outline-none placeholder:text-muted-foreground/30 disabled:opacity-50"
        />
        {running
          ? <Square className="w-3 h-3 text-destructive/60 flex-shrink-0 mt-1.5" />
          : <button onClick={run} disabled={!input.trim()}>
              <Play className="w-3 h-3 text-accent/60 hover:text-accent flex-shrink-0 mt-1.5 disabled:opacity-30" />
            </button>
        }
      </div>
    </div>
  );
}

// ── Docker tab ─────────────────────────────────────────────────────────────────
function DockerTab() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading]       = useState(false);
  const [output, setOutput]         = useState("");
  const [error, setError]           = useState("");

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const c = await agent.getDockerContainers();
      setContainers(c);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const doAction = async (action: string, name: string) => {
    setOutput(`Running ${action} on ${name}…`);
    try {
      const out = await agent.dockerAction(action, name);
      setOutput(out);
      if (["start","stop","restart"].includes(action)) refresh();
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
  };

  const statusColor = (state: string) => {
    if (state === "running") return "text-success";
    if (state === "exited") return "text-destructive/70";
    return "text-warning";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-border/30 flex items-center justify-between flex-shrink-0">
        <span className="text-[9px] font-mono-tech text-muted-foreground/40">{containers.length} containers</span>
        <button onClick={refresh} className="text-muted-foreground/40 hover:text-primary transition-colors">
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="mx-2 mt-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-[10px] text-destructive/80 font-mono-tech">{error}</p>
          <p className="text-[9px] text-muted-foreground/50">Is Docker running?</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {containers.map(c => (
          <div key={c.ID} className="rounded-lg border border-border/30 bg-secondary/10 px-2.5 py-2">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className={`text-[10px] font-mono-tech font-medium truncate ${statusColor(c.State)}`}>
                  {c.Names?.replace(/^\//, "") || c.ID?.slice(0, 12)}
                </p>
                <p className="text-[9px] text-muted-foreground/50 truncate">{c.Image}</p>
                <p className="text-[9px] text-muted-foreground/40 truncate">{c.Status}</p>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                {c.State !== "running" && (
                  <button onClick={() => doAction("start", c.Names?.replace(/^\//, "") || c.ID)}
                    className="text-[9px] font-mono-tech text-success/60 hover:text-success bg-success/10 px-1.5 py-0.5 rounded transition-all">
                    start
                  </button>
                )}
                {c.State === "running" && (
                  <button onClick={() => doAction("stop", c.Names?.replace(/^\//, "") || c.ID)}
                    className="text-[9px] font-mono-tech text-destructive/60 hover:text-destructive bg-destructive/10 px-1.5 py-0.5 rounded transition-all">
                    stop
                  </button>
                )}
                <button onClick={() => doAction("logs", c.Names?.replace(/^\//, "") || c.ID)}
                  className="text-[9px] font-mono-tech text-primary/60 hover:text-primary bg-primary/10 px-1.5 py-0.5 rounded transition-all">
                  logs
                </button>
              </div>
            </div>
            {c.Ports && <p className="text-[9px] text-muted-foreground/30 font-mono-tech mt-0.5 truncate">{c.Ports}</p>}
          </div>
        ))}
      </div>

      {output && (
        <div className="px-2 py-2 border-t border-border/30 flex-shrink-0">
          <pre className="text-[9px] font-mono-tech text-foreground/60 max-h-24 overflow-y-auto whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

// ── Files tab ──────────────────────────────────────────────────────────────────
function FilesTab() {
  const [path, setPath]     = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const browse = async (p?: string) => {
    setLoading(true); setError("");
    try {
      const result = await agent.listDir(p || path || "~");
      setEntries(result);
      if (p) setPath(p);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-border/30 flex gap-1.5 flex-shrink-0">
        <input value={path} onChange={e => setPath(e.target.value)}
          onKeyDown={e => e.key === "Enter" && browse(path)}
          placeholder="Path (blank = home)"
          className="flex-1 bg-secondary/30 border border-border/30 rounded px-2 py-1 text-[9px] font-mono-tech text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40"
        />
        <button onClick={() => browse(path)} disabled={loading}
          className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-mono-tech transition-all disabled:opacity-30">
          {loading ? "…" : "Go"}
        </button>
      </div>
      {error && <p className="text-[9px] text-destructive/70 font-mono-tech px-2 py-1">{error}</p>}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {entries.map(e => (
          <div key={e.path}
            className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-secondary/30 cursor-pointer transition-colors group"
            onClick={() => e.type === "dir" && browse(e.path)}>
            <span className="text-xs">{e.type === "dir" ? "📁" : "📄"}</span>
            <span className="text-[10px] font-mono-tech text-foreground/70 truncate flex-1">{e.name}</span>
            {e.type === "file" && <span className="text-[9px] text-muted-foreground/30">{(e.size / 1024).toFixed(0)}K</span>}
          </div>
        ))}
        {entries.length === 0 && !loading && !error && (
          <p className="text-[9px] text-muted-foreground/30 font-mono-tech py-2 px-1">Enter a path and click Go</p>
        )}
      </div>
    </div>
  );
}

// ── System tab ─────────────────────────────────────────────────────────────────
function SystemTab({ onScreenshot }: { onScreenshot?: (base64: string) => void }) {
  const [info, setInfo]         = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [ssLoading, setSsLoading] = useState(false);

  const fetchInfo = async () => {
    setLoading(true);
    try { setInfo(await agent.getSystemInfo()); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchInfo(); }, []);

  const takeScreenshot = async () => {
    setSsLoading(true);
    try {
      const ss = await agent.screenshot();
      if (ss && onScreenshot) onScreenshot(ss.base64);
      else if (!ss) alert("Screenshot failed — check agent window for errors");
    } catch (e: any) {
      alert(`Screenshot error: ${e.message}`);
    } finally { setSsLoading(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-2 space-y-3">
      <button onClick={takeScreenshot} disabled={ssLoading}
        className="w-full py-2 rounded-xl bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-mono-tech flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all">
        <Monitor className="w-3 h-3" />
        {ssLoading ? "Capturing…" : "Screenshot Full Desktop"}
      </button>

      {info && (
        <div className="space-y-1">
          {[
            ["Platform", info.platform],
            ["Arch", info.arch],
            ["User", info.user],
            ["Hostname", info.hostname],
            ["CPU", `${info.cpuCores}× ${info.cpuModel}`],
            ["RAM", `${info.memFreeGB}GB free / ${info.memTotalGB}GB`],
            ["RAM Used", `${info.memUsedPct}%`],
            ["Node", info.nodeVersion],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[9px] font-mono-tech py-0.5 border-b border-border/20">
              <span className="text-muted-foreground/50">{k}</span>
              <span className="text-foreground/70 truncate max-w-[120px] text-right">{v}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={fetchInfo} disabled={loading}
        className="w-full py-1.5 rounded-lg bg-secondary/30 text-muted-foreground/50 hover:text-foreground text-[9px] font-mono-tech flex items-center justify-center gap-1 transition-all">
        <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
