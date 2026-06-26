import React from "react";
import { useNavigate } from "react-router-dom";
export default function NotFound() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-display font-bold text-primary text-glow mb-2">404</div>
        <p className="text-muted-foreground text-sm mb-4">Page not found</p>
        <button onClick={() => nav("/")} className="text-primary text-sm underline">Return to LONNIE</button>
      </div>
    </div>
  );
}
