import React, { useState, useRef, useCallback } from "react";
import { Send, Square, Paperclip, Image as ImageIcon } from "lucide-react";

interface Props {
  onSend: (text: string, image?: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isGenerating, disabled }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const resize = () => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`; }
  };

  const submit = useCallback(() => {
    if (isGenerating || disabled) return;
    const t = text.trim();
    if (!t && !image) return;
    onSend(t, image ?? undefined);
    setText("");
    setImage(null);
    if (taRef.current) taRef.current.style.height = "auto";
  }, [text, image, isGenerating, disabled, onSend]);

  const attachFile = async () => {
    try {
      const [h] = await (window as any).showOpenFilePicker({
        types: [{ description: "Text", accept: { "text/*": [".txt",".md",".json",".ts",".js",".py",".csv",".html",".css",".yaml"] } }],
      });
      const f = await h.getFile();
      const content = await f.text();
      setText((p) => `${p}${p ? "\n\n" : ""}**${f.name}:**\n\`\`\`\n${content.slice(0, 4000)}${content.length > 4000 ? "\n...(truncated)" : ""}\n\`\`\``);
      taRef.current?.focus();
    } catch {}
  };

  const onImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setImage((ev.target!.result as string).split(",")[1]);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="border-t border-border/50 bg-card/10 px-4 pt-3 pb-4">
      {image && (
        <div className="mb-2 relative inline-block">
          <img src={`data:image/jpeg;base64,${image}`} alt="" className="h-14 w-auto rounded-lg border border-border/50 object-cover" />
          <button onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center font-bold">×</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Attachments */}
        <div className="flex gap-1 pb-1">
          <button onClick={attachFile} title="Attach text file" disabled={disabled}
            className="w-7 h-7 rounded-lg bg-secondary/40 hover:bg-secondary border border-border/40 text-muted-foreground hover:text-primary transition-all flex items-center justify-center disabled:opacity-30">
            <Paperclip className="w-3 h-3" />
          </button>
          <button onClick={() => imgRef.current?.click()} title="Attach image" disabled={disabled}
            className="w-7 h-7 rounded-lg bg-secondary/40 hover:bg-secondary border border-border/40 text-muted-foreground hover:text-primary transition-all flex items-center justify-center disabled:opacity-30">
            <ImageIcon className="w-3 h-3" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => { setText(e.target.value); resize(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={disabled ? "Waiting for Ollama connection…" : "Message LONNIE… (Enter to send, Shift+Enter for newline)"}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-secondary/40 border border-border/50 focus:border-primary/50 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none transition-colors font-body disabled:opacity-40"
          style={{ minHeight: "42px" }}
        />

        {/* Send / Stop */}
        {isGenerating ? (
          <button onClick={onStop}
            className="w-9 h-9 rounded-xl bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive flex items-center justify-center flex-shrink-0 transition-all"
            title="Stop">
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button onClick={submit}
            disabled={(!text.trim() && !image) || !!disabled}
            className="w-9 h-9 rounded-xl bg-primary/15 hover:bg-primary/25 disabled:opacity-25 disabled:cursor-not-allowed border border-primary/25 text-primary flex items-center justify-center flex-shrink-0 transition-all"
            title="Send">
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={onImageFile} />
    </div>
  );
}
