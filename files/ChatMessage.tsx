import React from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMsg } from "@/hooks/useOllama";
import { TOOL_REGISTRY } from "@/services/tools";

export function ChatMessage({ message }: { message: ChatMsg }) {
  const toolDef = message.toolName ? TOOL_REGISTRY.find((t) => t.name === message.toolName) : null;

  if (message.role === "tool") {
    const isRunning = message.content === "⏳ Running...";
    return (
      <div className="flex items-start gap-3 px-4 py-2 opacity-90">
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-warning/10 border border-warning/30 flex items-center justify-center text-xs">
          {isRunning ? <span className="animate-spin">⏳</span> : (toolDef?.emoji ?? "⚙️")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono-tech text-warning/70 uppercase tracking-widest">
              {toolDef?.label ?? message.toolName}
            </span>
          </div>
          {message.toolArgs && !isRunning && Object.keys(message.toolArgs).length > 0 && (
            <div className="text-[10px] font-mono-tech text-muted-foreground/60 mb-1.5">
              {Object.entries(message.toolArgs).map(([k, v]) => (
                <span key={k} className="mr-2">
                  <span className="text-muted-foreground/40">{k}=</span>
                  <span className="text-muted-foreground/70">{JSON.stringify(v).slice(0, 60)}</span>
                </span>
              ))}
            </div>
          )}
          <pre className="text-xs font-mono-tech text-muted-foreground/80 bg-muted/20 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-words border border-border/30 max-h-48">
            {message.content}
          </pre>
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex items-end gap-2.5 px-4 py-2 justify-end">
        <div className="max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-br-sm px-4 py-2.5">
          {message.imageBase64 && (
            <img
              src={`data:image/jpeg;base64,${message.imageBase64}`}
              alt="Attached"
              className="rounded-lg mb-2 max-h-40 object-contain"
            />
          )}
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
          U
        </div>
      </div>
    );
  }

  // assistant / error
  const isError = message.role === "error" as any;
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-xs flex-shrink-0 ${
        isError
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-accent/10 border-accent/30 text-accent"
      }`}>
        {message.isStreaming ? (
          <span className="flex gap-0.5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
        ) : isError ? "!" : "L"}
      </div>
      <div className="flex-1 min-w-0 prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }: any) {
              const isBlock = /language-/.test(className ?? "");
              return isBlock ? (
                <code className="block bg-secondary/60 rounded-lg p-3 text-xs font-mono-tech overflow-x-auto border border-border/40 text-foreground/80 not-prose" {...props}>
                  {children}
                </code>
              ) : (
                <code className="bg-secondary/80 text-primary px-1.5 py-0.5 rounded text-xs font-mono-tech" {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }: any) => <pre className="not-prose">{children}</pre>,
            p: ({ children }: any) => <p className="text-sm text-foreground/90 mb-2 last:mb-0 leading-relaxed">{children}</p>,
            h1: ({ children }: any) => <h1 className="text-base font-display font-bold text-primary mb-2 mt-3">{children}</h1>,
            h2: ({ children }: any) => <h2 className="text-sm font-display font-semibold text-primary/80 mb-1.5 mt-3">{children}</h2>,
            h3: ({ children }: any) => <h3 className="text-sm font-semibold text-foreground/80 mb-1 mt-2">{children}</h3>,
            ul: ({ children }: any) => <ul className="space-y-1 mb-2">{children}</ul>,
            ol: ({ children }: any) => <ol className="space-y-1 mb-2 list-decimal list-inside">{children}</ol>,
            li: ({ children }: any) => (
              <li className="text-sm text-foreground/90 flex items-start gap-1.5">
                <span className="text-primary mt-0.5 flex-shrink-0 text-xs">›</span>
                <span>{children}</span>
              </li>
            ),
            strong: ({ children }: any) => <strong className="font-semibold text-primary/90">{children}</strong>,
            em: ({ children }: any) => <em className="text-foreground/70">{children}</em>,
            a: ({ href, children }: any) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 hover:decoration-primary">
                {children}
              </a>
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
          }}
        >
          {message.content || (message.isStreaming ? "▋" : "")}
        </ReactMarkdown>
        {message.evalCount && !message.isStreaming && (
          <div className="mt-1">
            <span className="text-[10px] font-mono-tech text-muted-foreground/40">{message.evalCount} tokens</span>
          </div>
        )}
      </div>
    </div>
  );
}
