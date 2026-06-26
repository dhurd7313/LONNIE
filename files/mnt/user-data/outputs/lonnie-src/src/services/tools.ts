// src/services/tools.ts — Browser-native agent capabilities

export type ToolName =
  | "get_time"
  | "web_search"
  | "open_url"
  | "http_request"
  | "read_file"
  | "write_file"
  | "list_directory"
  | "get_clipboard"
  | "set_clipboard"
  | "send_notification"
  | "memory_store"
  | "memory_recall"
  | "memory_list"
  | "memory_delete"
  | "send_email"
  | "create_calendar_event"
  | "run_js"
  | "take_screenshot"
  | "get_battery"
  | "get_geolocation";

export interface ToolDef {
  name: ToolName;
  label: string;
  description: string;
  emoji: string;
  category: "system" | "web" | "files" | "memory" | "comms";
  enabledByDefault: boolean;
  requiresGrant?: boolean;
}

export const TOOL_REGISTRY: ToolDef[] = [
  // ── SYSTEM ───────────────────────────────────────────────────────────────
  { name: "get_time", label: "Clock & Time", description: "Get current time, date, day of week, and timezone", emoji: "🕐", category: "system", enabledByDefault: true },
  { name: "run_js", label: "Run JavaScript", description: "Evaluate JS expressions in a sandboxed context", emoji: "⚡", category: "system", enabledByDefault: true },
  { name: "get_clipboard", label: "Read Clipboard", description: "Read the current clipboard text", emoji: "📋", category: "system", enabledByDefault: true, requiresGrant: true },
  { name: "set_clipboard", label: "Write Clipboard", description: "Copy text to the clipboard", emoji: "📌", category: "system", enabledByDefault: true },
  { name: "send_notification", label: "Desktop Notification", description: "Push a notification to the desktop", emoji: "🔔", category: "system", enabledByDefault: true, requiresGrant: true },
  { name: "get_battery", label: "Battery Status", description: "Check device battery level and charging state", emoji: "🔋", category: "system", enabledByDefault: true },
  { name: "get_geolocation", label: "Geolocation", description: "Get your current GPS coordinates", emoji: "📍", category: "system", enabledByDefault: false, requiresGrant: true },
  { name: "take_screenshot", label: "Screenshot", description: "Capture the screen and download it", emoji: "📷", category: "system", enabledByDefault: false, requiresGrant: true },
  // ── WEB ──────────────────────────────────────────────────────────────────
  { name: "web_search", label: "Web Search", description: "Search the internet via DuckDuckGo, Google, or Perplexity", emoji: "🔍", category: "web", enabledByDefault: true },
  { name: "open_url", label: "Open URL", description: "Open any URL in a new browser tab", emoji: "🔗", category: "web", enabledByDefault: true },
  { name: "http_request", label: "HTTP Request", description: "Make GET/POST requests to any REST API", emoji: "🌐", category: "web", enabledByDefault: true },
  // ── FILES ─────────────────────────────────────────────────────────────────
  { name: "read_file", label: "Read File", description: "Open and read a local file", emoji: "📄", category: "files", enabledByDefault: true, requiresGrant: true },
  { name: "write_file", label: "Save File", description: "Create or save a file to disk", emoji: "💾", category: "files", enabledByDefault: true },
  { name: "list_directory", label: "Browse Folder", description: "List the contents of a local directory", emoji: "📁", category: "files", enabledByDefault: true, requiresGrant: true },
  // ── MEMORY ───────────────────────────────────────────────────────────────
  { name: "memory_store", label: "Store Memory", description: "Persist a key/value fact across sessions", emoji: "🧠", category: "memory", enabledByDefault: true },
  { name: "memory_recall", label: "Recall Memory", description: "Look up a stored memory by key", emoji: "💭", category: "memory", enabledByDefault: true },
  { name: "memory_list", label: "List Memories", description: "Show all stored memories", emoji: "🗂️", category: "memory", enabledByDefault: true },
  { name: "memory_delete", label: "Forget Memory", description: "Delete a stored memory by key", emoji: "🗑️", category: "memory", enabledByDefault: true },
  // ── COMMS ─────────────────────────────────────────────────────────────────
  { name: "send_email", label: "Send Email", description: "Open the mail client to compose an email", emoji: "📧", category: "comms", enabledByDefault: true },
  { name: "create_calendar_event", label: "Create Calendar Event", description: "Add an event to Google Calendar", emoji: "📅", category: "comms", enabledByDefault: true },
];

// ── Executor ──────────────────────────────────────────────────────────────────

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {

    case "get_time": {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        localDateTime: now.toLocaleString(),
        longDate: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        time: now.toLocaleTimeString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcOffset: -now.getTimezoneOffset() / 60,
        unixSeconds: Math.floor(now.getTime() / 1000),
      }, null, 2);
    }

    case "run_js": {
      const code = String(args.code ?? "");
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (() => { ${code} })()`)();
        if (result instanceof Promise) {
          const resolved = await result;
          return typeof resolved === "object" ? JSON.stringify(resolved, null, 2) : String(resolved ?? "(undefined)");
        }
        return typeof result === "object" ? JSON.stringify(result, null, 2) : String(result ?? "(undefined)");
      } catch (e: any) {
        return `RuntimeError: ${e.message}`;
      }
    }

    case "get_battery": {
      try {
        const bat = await (navigator as any).getBattery?.();
        if (!bat) return "Battery API not supported in this browser.";
        return JSON.stringify({
          level: `${Math.round(bat.level * 100)}%`,
          charging: bat.charging,
          chargingTime: bat.chargingTime === Infinity ? "not charging" : `${bat.chargingTime}s`,
          dischargingTime: bat.dischargingTime === Infinity ? "unknown" : `${bat.dischargingTime}s`,
        }, null, 2);
      } catch (e) {
        return `Battery check failed: ${e}`;
      }
    }

    case "get_geolocation": {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve("Geolocation is not supported in this browser.");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: `${pos.coords.accuracy}m`,
            altitude: pos.coords.altitude,
            timestamp: new Date(pos.timestamp).toISOString(),
          }, null, 2)),
          (err) => resolve(`Geolocation denied: ${err.message}`)
        );
      });
    }

    case "get_clipboard": {
      try {
        const text = await navigator.clipboard.readText();
        return text.trim() || "(clipboard is empty)";
      } catch {
        return "Clipboard read requires a user interaction first (click somewhere, then ask again).";
      }
    }

    case "set_clipboard": {
      const text = String(args.text ?? "");
      try {
        await navigator.clipboard.writeText(text);
        return `✅ Copied ${text.length} characters to clipboard.`;
      } catch {
        return "Clipboard write failed — browser blocked it.";
      }
    }

    case "send_notification": {
      const title = String(args.title ?? "LONNIE");
      const body = String(args.body ?? "");
      if (!("Notification" in window)) return "Notifications not supported.";
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
        return `✅ Notification sent: "${title}"`;
      }
      return "Notification permission denied by user.";
    }

    case "take_screenshot": {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: "monitor" } });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        return `✅ Screenshot captured (${bitmap.width}×${bitmap.height}) and downloaded.`;
      } catch (e: any) {
        if (e.name === "AbortError") return "Screenshot cancelled.";
        return `Screenshot failed: ${e.message}`;
      }
    }

    case "web_search": {
      const query = String(args.query ?? args.q ?? "");
      const engine = String(args.engine ?? "duckduckgo").toLowerCase();
      const ENGINES: Record<string, string> = {
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        perplexity: `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        github: `https://github.com/search?q=${encodeURIComponent(query)}`,
        npm: `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`,
      };
      const url = ENGINES[engine] ?? ENGINES.duckduckgo;
      window.open(url, "_blank", "noopener");
      return `✅ Opened ${engine} search for: "${query}"`;
    }

    case "open_url": {
      const url = String(args.url ?? "");
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return `Invalid URL: "${url}" — must start with http:// or https://`;
      }
      window.open(url, "_blank", "noopener");
      return `✅ Opened: ${url}`;
    }

    case "http_request": {
      const { url, method = "GET", headers = {}, body } = args as any;
      if (!url) return "Error: url is required.";
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...(headers as object) },
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        const truncated = text.length > 4000 ? text.slice(0, 4000) + "\n...(truncated)" : text;
        return `HTTP ${res.status} ${res.statusText}\n\n${truncated}`;
      } catch (e: any) {
        return `Request failed: ${e.message}`;
      }
    }

    case "read_file": {
      try {
        const opts: any = {};
        if (args.accept) opts.types = [{ description: "Files", accept: { "text/*": (args.accept as string).split(",") } }];
        const [handle] = await (window as any).showOpenFilePicker({ multiple: false, ...opts });
        const file = await handle.getFile();
        const text = await file.text();
        const truncated = text.length > 10000 ? text.slice(0, 10000) + "\n\n...(file truncated at 10,000 chars)" : text;
        return `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB, ${file.type || "text/plain"})\n\n${truncated}`;
      } catch (e: any) {
        if (e.name === "AbortError") return "File picker cancelled.";
        return `Read failed: ${e.message}`;
      }
    }

    case "write_file": {
      const filename = String(args.filename ?? "output.txt");
      const content = String(args.content ?? "");
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "Files", accept: { "text/plain": [".txt", ".md", ".json", ".csv", ".ts", ".js", ".py", ".html", ".css"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return `✅ Saved "${handle.name}" (${(content.length / 1024).toFixed(1)} KB)`;
      } catch (e: any) {
        if (e.name === "AbortError") return "Save cancelled.";
        return `Write failed: ${e.message}`;
      }
    }

    case "list_directory": {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: "read" });
        const entries: string[] = [];
        for await (const [name, entry] of (handle as any).entries()) {
          entries.push(`${entry.kind === "directory" ? "📁" : "📄"} ${name}`);
        }
        entries.sort();
        return `📁 ${handle.name}/\n${entries.join("\n") || "(empty)"}`;
      } catch (e: any) {
        if (e.name === "AbortError") return "Directory picker cancelled.";
        return `Directory access failed: ${e.message}`;
      }
    }

    case "memory_store": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Error: key is required.";
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      mem[key] = { value: args.value, savedAt: new Date().toISOString() };
      localStorage.setItem("lonnie_memory", JSON.stringify(mem));
      return `✅ Stored memory["${key}"] = ${JSON.stringify(args.value)}`;
    }

    case "memory_recall": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Error: key is required.";
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      if (!mem[key]) return `No memory found for key: "${key}". Use memory_list to see all stored keys.`;
      return `memory["${key}"] = ${JSON.stringify(mem[key].value)}\n(saved ${mem[key].savedAt})`;
    }

    case "memory_list": {
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      const keys = Object.keys(mem);
      if (!keys.length) return "No memories stored yet.";
      return keys.map((k) => `• "${k}": ${JSON.stringify(mem[k].value).slice(0, 80)} (${mem[k].savedAt.slice(0, 10)})`).join("\n");
    }

    case "memory_delete": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Error: key is required.";
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      if (!mem[key]) return `No memory found for key: "${key}"`;
      delete mem[key];
      localStorage.setItem("lonnie_memory", JSON.stringify(mem));
      return `✅ Deleted memory["${key}"]`;
    }

    case "send_email": {
      const { to = "", subject = "", body = "" } = args as any;
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto);
      return `✅ Mail client opened — To: ${to || "(you)"}, Subject: "${subject}"`;
    }

    case "create_calendar_event": {
      const { title = "New Event", start = "", end = "", description = "", location = "" } = args as any;
      const fmt = (d: string) => d.replace(/[-:.TZ]/g, "").slice(0, 15).padEnd(15, "0");
      const params = new URLSearchParams({ action: "TEMPLATE", text: title, details: description, location });
      if (start && end) params.set("dates", `${fmt(start)}/${fmt(end)}`);
      window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank", "noopener");
      return `✅ Google Calendar opened for: "${title}"`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

/** Parse a tool call JSON block from model output */
export function parseToolCall(text: string): { tool: ToolName; args: Record<string, unknown> } | null {
  // Match ```json { "tool": ... } ``` blocks
  const match = text.match(/```(?:json|tool)?\s*\n?(\{[\s\S]*?"tool"[\s\S]*?\})\s*\n?```/i);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    if (obj.tool && TOOL_REGISTRY.some((t) => t.name === obj.tool)) {
      return { tool: obj.tool as ToolName, args: obj.args ?? {} };
    }
  } catch {}
  return null;
}

/** Build the system prompt with available tools listed */
export function buildSystemPrompt(enabledTools: ToolName[]): string {
  const available = TOOL_REGISTRY.filter((t) => enabledTools.includes(t.name));
  const toolList = available.map((t) => `- **${t.name}** (${t.emoji} ${t.label}): ${t.description}`).join("\n");

  return `You are LONNIE, a powerful autonomous AI agent running entirely on the user's local machine via Ollama. You have real, browser-native capabilities — not simulations.

## Your Active Tools
${toolList || "No tools currently enabled."}

## How to invoke a tool
When you need to use a tool, output ONLY a fenced JSON block like this — place it alone on its own line:

\`\`\`json
{
  "tool": "<tool_name>",
  "args": {
    "key": "value"
  }
}
\`\`\`

The system will execute it and return the result. You then respond normally based on what you received.

## Rules
1. Always use tools when the user's question requires current/live data (time, files, web, memory).
2. After receiving a TOOL RESULT, incorporate it naturally into your reply — don't just repeat the raw data.
3. You run 100% locally. No data leaves the machine unless the user explicitly opens a URL or sends email.
4. Be direct and helpful. Use markdown formatting. Keep code in \`\`\` blocks.
5. When you store something to memory, confirm what you stored so the user knows you remembered it.`;
}
