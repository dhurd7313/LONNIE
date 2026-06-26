import React, { useState, useEffect } from "react";
import { Activity, Cpu, Database, Wifi, Clock, Zap } from "lucide-react";
import { memory } from "@/lib/memory";
import { gef } from "@/lib/gef";
import { kb } from "@/lib/knowledge";

interface DiagState {
  uptime: number;
  memoryCount: number;
  goalCount: number;
  knowledgeCount: number;
  browserInfo: string;
  online: boolean;
  battery?: { level: string; charging: boolean };
  timestamp: string;
}

export function DiagnosticsPanel() {
  const [diag, setDiag] = useState<DiagState | null>(null);
  const [startTime] = useState(Date.now());

  const refresh = async () => {
    const memories = await memory.getAll();
    const goals = gef.getAll();
    await kb.load();
    const knowledge = kb.getAll();

    let battery;
    try {
      const bat = await (navigator as any).getBattery?.();
      if (bat) battery = { level: `${Math.round(bat.level * 100)}%`, charging: bat.charging };
    } catch {}

    setDiag({
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memoryCount: memories.filter(m => !m.key.startsWith("__")).length,
      goalCount: goals.length,
      knowledgeCount: knowledge.length,
      browserInfo: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] ?? "Unknown",
      online: navigator.onLine,
      battery,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const stat = (label: string, value: string | number, icon: React.ReactNode, color = "text-primary") => (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className={`${color} opacity-60`}>{icon}</span>
        <span className="text-[10px] text-muted-foreground/70">{label}</span>
      </div>
      <span className={`text-[10px] font-mono-tech ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono-tech text-primary uppercase tracking-widest">Diagnostics</span>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">System health · updates every 5s</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!diag ? (
          <p className="text-[10px] text-muted-foreground/40 font-mono-tech">Loading…</p>
        ) : (
          <div className="space-y-3">
            {/* Status */}
            <div>
              <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1">System</p>
              {stat("Status", diag.online ? "ONLINE" : "OFFLINE", <Wifi className="w-2.5 h-2.5" />, diag.online ? "text-success" : "text-destructive")}
              {stat("Uptime", `${Math.floor(diag.uptime/60)}m ${diag.uptime%60}s`, <Clock className="w-2.5 h-2.5" />)}
              {stat("Browser", diag.browserInfo, <Cpu className="w-2.5 h-2.5" />)}
              {diag.battery && stat("Battery", `${diag.battery.level} ${diag.battery.charging ? "⚡" : ""}`, <Zap className="w-2.5 h-2.5" />)}
            </div>

            {/* Data */}
            <div>
              <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1">Data</p>
              {stat("Memories", diag.memoryCount, <Database className="w-2.5 h-2.5" />)}
              {stat("Goals (GEF)", diag.goalCount, <Activity className="w-2.5 h-2.5" />)}
              {stat("Knowledge", diag.knowledgeCount, <Database className="w-2.5 h-2.5" />)}
            </div>

            {/* Storage estimate */}
            <div>
              <p className="text-[9px] font-mono-tech text-muted-foreground/40 uppercase tracking-widest mb-1">Storage</p>
              <StorageEstimate />
            </div>

            <p className="text-[9px] text-muted-foreground/30 font-mono-tech text-right">
              Last updated: {diag.timestamp}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StorageEstimate() {
  const [estimate, setEstimate] = useState<string>("…");
  useEffect(() => {
    (async () => {
      try {
        const est = await (navigator.storage as any)?.estimate?.();
        if (est) {
          const used = (est.usage / 1024 / 1024).toFixed(2);
          const quota = (est.quota / 1024 / 1024).toFixed(0);
          setEstimate(`${used} MB / ${quota} MB`);
        } else {
          setEstimate("N/A");
        }
      } catch { setEstimate("N/A"); }
    })();
  }, []);

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        <Database className="w-2.5 h-2.5 text-primary opacity-60" />
        <span className="text-[10px] text-muted-foreground/70">IndexedDB used</span>
      </div>
      <span className="text-[10px] font-mono-tech text-primary">{estimate}</span>
    </div>
  );
}
