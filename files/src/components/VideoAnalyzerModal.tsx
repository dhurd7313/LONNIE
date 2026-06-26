import React, { useState, useRef, useCallback } from "react";
import { X, Film, Play, Upload, Loader2 } from "lucide-react";
import { extractFrames, formatTimestamp, type VideoSegment } from "@/lib/videoAnalyzer";
import { aiClient } from "@/integrations/ollama/client";
import { WATCH_SKILL } from "@/lib/skills";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedModel: string;
  onResult: (summary: string) => void;
}

export function VideoAnalyzerModal({ open, onClose, selectedModel, onResult }: Props) {
  const [file, setFile]               = useState<File | null>(null);
  const [segments, setSegments]       = useState<VideoSegment[]>([]);
  const [status, setStatus]           = useState("");
  const [progress, setProgress]       = useState(0);
  const [phase, setPhase]             = useState<"idle" | "extracting" | "analyzing" | "done">("idle");
  const [segmentInterval, setSegmentInterval] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSegments([]);
    setPhase("idle");
    setStatus("");
    e.target.value = "";
  };

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      // Phase 1: Extract frames
      setPhase("extracting");
      setProgress(0);
      setStatus("Extracting frames…");

      const extracted = await extractFrames(
        file,
        1,
        segmentInterval,
        (pct, msg) => { setProgress(pct); setStatus(msg); }
      );
      setSegments(extracted);

      // Phase 2: Analyze each frame with vision model
      setPhase("analyzing");
      const analyzed: VideoSegment[] = [];
      const systemPrompt = WATCH_SKILL.systemPrompt;

      for (let i = 0; i < extracted.length; i++) {
        if (signal.aborted) break;
        const seg = extracted[i];
        setProgress(60 + Math.round((i / extracted.length) * 35));
        setStatus(`Analyzing segment ${i + 1}/${extracted.length} at ${formatTimestamp(seg.timestamp)}…`);

        try {
          const base64 = seg.frameDataUrl.split(",")[1];
          let analysis = "";

          for await (const delta of aiClient.streamChat(
            [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
                  { type: "text", text: `Frame at ${formatTimestamp(seg.timestamp)}. Describe what you see concisely.` },
                ],
              },
            ],
            selectedModel,
            { temperature: 0.2 },
            signal
          )) {
            analysis += delta.text;
          }

          analyzed.push({ ...seg, analysis });
          setSegments([...analyzed]);
        } catch {
          analyzed.push({ ...seg, analysis: "(analysis failed for this frame)" });
        }
      }

      // Phase 3: Overall summary
      setProgress(96);
      setStatus("Generating full summary…");

      const segmentDescriptions = analyzed
        .map(s => `[${formatTimestamp(s.timestamp)}] ${s.analysis ?? ""}`)
        .join("\n");

      let summary = "";
      for await (const delta of aiClient.streamChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `I've analyzed ${analyzed.length} frames from "${file.name}" (${formatTimestamp(analyzed[analyzed.length - 1]?.timestamp ?? 0)} total).\n\nFrame-by-frame analysis:\n${segmentDescriptions}\n\nNow provide a comprehensive summary: overall content, key moments, themes, and anything notable.`,
          },
        ],
        selectedModel,
        { temperature: 0.4 },
        signal
      )) {
        summary += delta.text;
      }

      setProgress(100);
      setPhase("done");
      setStatus("Analysis complete.");

      // Send result back to chat
      const fullReport = `## Video Analysis: ${file.name}\n\n**${analyzed.length} segments analyzed**\n\n### Segment Breakdown\n${analyzed.map(s => `**[${formatTimestamp(s.timestamp)}]** ${s.analysis}`).join("\n\n")}\n\n### Summary\n${summary}`;
      onResult(fullReport);

    } catch (e: any) {
      if (e.name !== "AbortError") {
        setStatus(`Error: ${e.message}`);
        setPhase("idle");
      }
    }
  }, [file, selectedModel, segmentInterval, onResult]);

  const handleStop = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setStatus("Stopped.");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-accent" />
            <div>
              <h2 className="text-sm font-display font-bold text-accent tracking-widest uppercase">Video Analyst</h2>
              <p className="text-[10px] text-muted-foreground font-mono-tech">watch.skill · frame extraction + vision analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* File picker */}
          <div>
            <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2 block">
              Video File
            </label>
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border/50 hover:border-accent/40 text-muted-foreground hover:text-foreground transition-all flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5" />
              <span className="text-sm">{file ? file.name : "Click to select video"}</span>
              <span className="text-[10px] opacity-60">MP4, WebM, MOV, AVI</span>
            </button>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Settings */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
                Frame interval
              </label>
              <span className="text-[10px] font-mono-tech text-primary">every {segmentInterval}s</span>
            </div>
            <input type="range" min="2" max="30" step="1" value={segmentInterval}
              onChange={e => setSegmentInterval(parseInt(e.target.value))}
              className="w-full accent-accent h-1" />
            <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-0.5 font-mono-tech">
              <span>2s (detailed)</span><span>30s (overview)</span>
            </div>
          </div>

          {/* Vision model warning */}
          {!selectedModel.match(/gpt-4|gemini|llava|vision/i) && (
            <div className="px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-[10px] text-warning/80 font-mono-tech">
                ⚠ Current model may not support vision. For best results use: GPT-4o, Gemini 1.5, or LLaVA (Ollama).
              </p>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">Current: {selectedModel}</p>
            </div>
          )}

          {/* Progress */}
          {phase !== "idle" && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono-tech">
                <span className="text-muted-foreground">{status}</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Analyzed segments preview */}
          {segments.length > 0 && (
            <div>
              <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">
                Segments ({segments.filter(s => s.analysis).length}/{segments.length} analyzed)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {segments.map(seg => (
                  <div key={seg.index} className="flex gap-2 items-start">
                    <img src={seg.frameDataUrl} alt={`Frame at ${formatTimestamp(seg.timestamp)}`}
                      className="w-16 h-10 rounded-lg object-cover flex-shrink-0 border border-border/30" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-mono-tech text-primary">{formatTimestamp(seg.timestamp)}</span>
                      {seg.analysis ? (
                        <p className="text-[10px] text-foreground/70 leading-snug">{seg.analysis.slice(0, 120)}{seg.analysis.length > 120 ? "…" : ""}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> analyzing…
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/50 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Close
          </button>
          <div className="flex gap-2">
            {phase === "analyzing" || phase === "extracting" ? (
              <button onClick={handleStop}
                className="px-4 py-2 rounded-xl bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive text-xs font-semibold transition-all">
                Stop
              </button>
            ) : (
              <button onClick={handleAnalyze} disabled={!file || phase === "done"}
                className="px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 disabled:opacity-30 border border-accent/30 text-accent text-xs font-semibold transition-all flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                {phase === "done" ? "Done" : "Analyze Video"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
