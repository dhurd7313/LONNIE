import React from "react";
import { useNavigate } from "react-router-dom";
export default function SystemConsent() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border/50 rounded-2xl p-6">
        <h1 className="text-xl font-display font-bold text-primary text-glow mb-2">LONNIE Permissions</h1>
        <p className="text-sm text-muted-foreground mb-5">
          LONNIE runs entirely locally via Ollama. These browser APIs require your permission when first used.
        </p>
        <ul className="space-y-2 mb-6 text-sm">
          {[["📋","Clipboard","Read/write clipboard contents"],["📄","File System","Open and save files via browser dialog"],["🔔","Notifications","Send desktop notifications"],["📍","Geolocation","Get your GPS location when asked"],["📷","Screen Capture","Take screenshots when asked"]].map(([e,l,d])=>(
            <li key={l} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/30">
              <span className="text-lg">{e}</span>
              <div><div className="font-medium text-foreground/90">{l}</div><div className="text-xs text-muted-foreground">{d}</div></div>
            </li>
          ))}
        </ul>
        <button onClick={() => nav("/")} className="w-full py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-medium text-sm transition-all">
          Let's go →
        </button>
      </div>
    </div>
  );
}
