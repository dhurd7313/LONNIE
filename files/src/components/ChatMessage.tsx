import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "@/hooks/useOllama";
import { TOOL_REGISTRY } from "@/services/tools";
import type { ImageResult } from "@/services/tools";
import { Copy, Check } from "lucide-react";

function tryParseImageResult(content: string): ImageResult | null {
  try {
    const p = JSON.parse(content);
    if (p?.type === "image" && p?.url) return p;
  } catch {}
  return null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy}
      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded bg-secondary/60 hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function ChatMessage({ message }: { message: Message }) {
  const toolDef = message.toolName ? TOOL_REGISTRY.find(t => t.name === message.toolName) : null;

  // Tool result message
  if (message.role === "tool") {
    const imgResult = tryParseImageResult(message.content);
    const isRunning = message.content === "⏳ Running...";

    return (
      <div className="flex items-start gap-2.5 px-4 py-2 opacity-90">
        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-warning/10 border border-warning/20 flex items-center justify-center text-xs mt-0.5">
          {isRunning ? <span className="animate-spin">⏳</span> : (toolDef?.emoji ?? "⚙️")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-mono-tech text-warning/60 uppercase tracking-widest mb-1.5">
            {toolDef?.label ?? message.toolName}
          </div>

          {imgResult ? (
            <div className="space-y-1.5">
              <img
                src={imgResult.url}
                alt={imgResult.query}
                className="rounded-xl border border-border/40 max-w-sm w-full object-cover max-h-72"
                onError={e => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const div = document.createElement("div");
                  div.className = "text-xs text-muted-foreground/60 p-2 bg-secondary/30 rounded-lg";
                  div.innerHTML = `Image failed to load for: "${imgResult.query}" — <a href="https://www.google.com/search?q=${encodeURIComponent(imgResult.query)}&tbm=isch" target="_blank" class="text-primary underline">Search Google Images</a>`;
                  el.parentNode?.appendChild(div);
                }}
              />
              <p className="text-[9px] font-mono-tech text-muted-foreground/40">
                via {imgResult.source} · "{imgResult.query}"
              </p>
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-warning/40 rounded-full animate-bounce" style={{animationDelay:`${i*150}ms`}} />)}
              </span>
              <span className="text-[9px] text-muted-foreground/40 font-mono-tech">running…</span>
            </div>
          ) : (
            <div className="relative group">
              <pre className="text-[10px] font-mono-tech text-foreground/70 bg-muted/15 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-words border border-border/20 max-h-48">
                {message.content}
              </pre>
              {message.content.length > 10 && <CopyButton text={message.content} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  // User message
  if (message.role === "user") {
    return (
      <div className="flex items-end gap-2 px-4 py-2 justify-end">
        <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5">
          {message.imageBase64 && (
            <img
              src={`data:image/jpeg;base64,${message.imageBase64}`}
              alt="Attached"
              className="rounded-lg mb-2 max-h-48 object-contain"
            />
          )}
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">U</div>
      </div>
    );
  }

  // Assistant / error
  const isError = (message.role as string) === "error";
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <div className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] mt-0.5 ${
        isError ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-accent/10 border-accent/20 text-accent"
      }`}>
        {message.isStreaming ? (
          <span className="flex gap-0.5">
            {[0,150,300].map(d => <span key={d} className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay:`${d}ms`}} />)}
          </span>
        ) : isError ? "!" : "L"}
      </div>

      <div className="flex-1 min-w-0 prose prose-sm prose-invert max-w-none">
        <ReactMarkdown components={{
          code({ className, children, ...props }: any) {
            const isBlock = /language-/.test(className ?? "");
            if (!isBlock) return (
              <code className="bg-secondary/70 text-primary px-1.5 py-0.5 rounded text-xs font-mono-tech" {...props}>{children}</code>
            );
            return (
              <div className="relative group">
                <code className="block bg-secondary/50 rounded-lg p-3 text-xs font-mono-tech overflow-x-auto border border-border/30 text-foreground/80 not-prose" {...props}>{children}</code>
                <CopyButton text={String(children)} />
              </div>
            );
          },
          pre: ({ children }: any) => <pre className="not-prose">{children}</pre>,
          p: ({ children }: any) => <p className="text-sm text-foreground/90 mb-2 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }: any) => <h1 className="text-base font-display font-bold text-primary mb-2 mt-3">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-sm font-display font-semibold text-primary/80 mb-1.5 mt-3">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-sm font-semibold text-foreground/80 mb-1 mt-2">{children}</h3>,
          ul: ({ children }: any) => <ul className="space-y-1 mb-2">{children}</ul>,
          ol: ({ children }: any) => <ol className="space-y-1 mb-2 list-decimal list-inside text-sm">{children}</ol>,
          li: ({ children }: any) => (
            <li className="text-sm text-foreground/90 flex items-start gap-1.5">
              <span className="text-primary/60 mt-0.5 flex-shrink-0 text-xs">›</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }: any) => <strong className="font-semibold text-primary/90">{children}</strong>,
          a: ({ href, children }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-primary underline decoration-primary/30 hover:decoration-primary">{children}</a>
          ),
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm text-foreground/70 italic my-2">{children}</blockquote>
          ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto mb-2">
              <table className="text-xs w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }: any) => <th className="border border-border/50 px-2 py-1 text-left text-primary/80 font-mono-tech bg-secondary/30">{children}</th>,
          td: ({ children }: any) => <td className="border border-border/50 px-2 py-1 text-foreground/80">{children}</td>,
          hr: () => <hr className="border-border/30 my-3" />,
        }}>
          {message.content || (message.isStreaming ? "▋" : "")}
        </ReactMarkdown>
        {message.tokens && !message.isStreaming && (
          <span className="text-[9px] font-mono-tech text-muted-foreground/30">{message.tokens} tokens</span>
        )}
      </div>
    </div>
  );
}
