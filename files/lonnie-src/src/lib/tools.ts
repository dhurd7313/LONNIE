export type ToolName =
  | "web_search"
  | "read_file"
  | "write_file"
  | "run_command"
  | "get_time"
  | "get_clipboard"
  | "set_clipboard"
  | "http_request"
  | "take_screenshot"
  | "list_directory"
  | "open_url"
  | "send_notification"
  | "memory_store"
  | "memory_recall"
  | "summarize"
  | "translate"
  | "analyze_image"
  | "generate_image"
  | "send_email"
  | "create_event";

export interface Tool {
  name: ToolName;
  label: string;
  description: string;
  icon: string;
  category: "system" | "web" | "file" | "ai" | "comms";
  enabled: boolean;
  requiresPermission?: boolean;
}

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export const ALL_TOOLS: Tool[] = [
  {
    name: "get_time",
    label: "Clock & Time",
    description: "Get current time, date, timezone info",
    icon: "🕐",
    category: "system",
    enabled: true,
  },
  {
    name: "web_search",
    label: "Web Search",
    description: "Search the internet for current information",
    icon: "🔍",
    category: "web",
    enabled: true,
  },
  {
    name: "http_request",
    label: "HTTP Requests",
    description: "Make GET/POST requests to any API or URL",
    icon: "🌐",
    category: "web",
    enabled: true,
  },
  {
    name: "open_url",
    label: "Open URLs",
    description: "Open links in the browser",
    icon: "🔗",
    category: "web",
    enabled: true,
  },
  {
    name: "read_file",
    label: "Read Files",
    description: "Read files from the local filesystem",
    icon: "📄",
    category: "file",
    enabled: true,
    requiresPermission: true,
  },
  {
    name: "write_file",
    label: "Write Files",
    description: "Create and write files to disk",
    icon: "💾",
    category: "file",
    enabled: false,
    requiresPermission: true,
  },
  {
    name: "list_directory",
    label: "Browse Directories",
    description: "List folder contents",
    icon: "📁",
    category: "file",
    enabled: true,
    requiresPermission: true,
  },
  {
    name: "run_command",
    label: "Run Shell Commands",
    description: "Execute terminal commands on your machine",
    icon: "⚡",
    category: "system",
    enabled: false,
    requiresPermission: true,
  },
  {
    name: "get_clipboard",
    label: "Read Clipboard",
    description: "Read the current clipboard contents",
    icon: "📋",
    category: "system",
    enabled: true,
    requiresPermission: true,
  },
  {
    name: "set_clipboard",
    label: "Write Clipboard",
    description: "Copy text to clipboard",
    icon: "📌",
    category: "system",
    enabled: true,
  },
  {
    name: "send_notification",
    label: "Notifications",
    description: "Send desktop notifications",
    icon: "🔔",
    category: "system",
    enabled: true,
    requiresPermission: true,
  },
  {
    name: "memory_store",
    label: "Store Memory",
    description: "Save information to persistent memory",
    icon: "🧠",
    category: "ai",
    enabled: true,
  },
  {
    name: "memory_recall",
    label: "Recall Memory",
    description: "Retrieve stored information",
    icon: "💭",
    category: "ai",
    enabled: true,
  },
  {
    name: "summarize",
    label: "Summarize",
    description: "Condense long content into key points",
    icon: "📝",
    category: "ai",
    enabled: true,
  },
  {
    name: "translate",
    label: "Translate",
    description: "Translate text between languages",
    icon: "🌍",
    category: "ai",
    enabled: true,
  },
  {
    name: "analyze_image",
    label: "Analyze Images",
    description: "Describe and analyze image content",
    icon: "🖼️",
    category: "ai",
    enabled: true,
  },
  {
    name: "send_email",
    label: "Send Email",
    description: "Compose and send emails via mailto",
    icon: "📧",
    category: "comms",
    enabled: true,
  },
  {
    name: "create_event",
    label: "Create Calendar Events",
    description: "Add events to your calendar",
    icon: "📅",
    category: "comms",
    enabled: true,
  },
];

// ── Real browser-level tool executors ──────────────────────────────────────

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_time": {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        locale: now.toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        unix: Math.floor(now.getTime() / 1000),
      });
    }

    case "web_search": {
      const query = encodeURIComponent(String(args.query || ""));
      // Open DuckDuckGo in new tab; return the search URL so model knows
      window.open(`https://duckduckgo.com/?q=${query}`, "_blank");
      return `Opened web search for: "${args.query}". Results will appear in your browser.`;
    }

    case "open_url": {
      const url = String(args.url || "");
      window.open(url, "_blank");
      return `Opened ${url} in browser.`;
    }

    case "http_request": {
      const { url, method = "GET", headers = {}, body } = args as {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      };
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        return `Status: ${res.status}\nBody: ${text.slice(0, 2000)}`;
      } catch (e) {
        return `Request failed: ${e}`;
      }
    }

    case "get_clipboard": {
      try {
        const text = await navigator.clipboard.readText();
        return `Clipboard contents:\n${text}`;
      } catch {
        return "Permission denied: clipboard access requires user gesture.";
      }
    }

    case "set_clipboard": {
      try {
        await navigator.clipboard.writeText(String(args.text || ""));
        return "Text copied to clipboard successfully.";
      } catch {
        return "Failed to write to clipboard.";
      }
    }

    case "send_notification": {
      const { title = "LONNIE", body = "" } = args as {
        title?: string;
        body?: string;
      };
      if (!("Notification" in window)) return "Notifications not supported.";
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        new Notification(title, { body });
        return `Notification sent: "${title}" - ${body}`;
      }
      return "Notification permission denied.";
    }

    case "memory_store": {
      const key = String(args.key || "default");
      const value = args.value;
      const memories = JSON.parse(localStorage.getItem("lonnie_memory") || "{}");
      memories[key] = { value, savedAt: new Date().toISOString() };
      localStorage.setItem("lonnie_memory", JSON.stringify(memories));
      return `Stored "${key}" in memory.`;
    }

    case "memory_recall": {
      const key = String(args.key || "");
      const memories = JSON.parse(localStorage.getItem("lonnie_memory") || "{}");
      if (key && memories[key]) {
        return `Memory "${key}": ${JSON.stringify(memories[key].value)} (saved ${memories[key].savedAt})`;
      }
      if (!key) {
        return `All memories:\n${JSON.stringify(memories, null, 2)}`;
      }
      return `No memory found for key: "${key}"`;
    }

    case "read_file": {
      // Use File System Access API
      try {
        const [handle] = await (window as any).showOpenFilePicker();
        const file = await handle.getFile();
        const text = await file.text();
        return `File: ${file.name}\n\n${text.slice(0, 5000)}${text.length > 5000 ? "\n...(truncated)" : ""}`;
      } catch (e) {
        return `File read cancelled or failed: ${e}`;
      }
    }

    case "write_file": {
      try {
        const opts = {
          suggestedName: String(args.filename || "output.txt"),
          types: [{ description: "Text file", accept: { "text/plain": [".txt"] } }],
        };
        const handle = await (window as any).showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(String(args.content || ""));
        await writable.close();
        return `File saved as: ${handle.name}`;
      } catch (e) {
        return `File write cancelled or failed: ${e}`;
      }
    }

    case "list_directory": {
      try {
        const handle = await (window as any).showDirectoryPicker();
        const entries: string[] = [];
        for await (const [name, entry] of handle.entries()) {
          entries.push(`${entry.kind === "directory" ? "📁" : "📄"} ${name}`);
        }
        return `Directory: ${handle.name}\n${entries.join("\n")}`;
      } catch (e) {
        return `Directory access cancelled: ${e}`;
      }
    }

    case "send_email": {
      const { to, subject, body } = args as {
        to?: string;
        subject?: string;
        body?: string;
      };
      const mailto = `mailto:${to || ""}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(body || "")}`;
      window.open(mailto);
      return `Email client opened to: ${to}`;
    }

    case "create_event": {
      const { title, start, end, details } = args as {
        title?: string;
        start?: string;
        end?: string;
        details?: string;
      };
      const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
      const params = new URLSearchParams({
        text: title || "New Event",
        dates: `${(start || "").replace(/[-:]/g, "")}/${(end || "").replace(/[-:]/g, "")}`,
        details: details || "",
      });
      window.open(`${base}&${params}`, "_blank");
      return `Calendar event creation opened for: "${title}"`;
    }

    case "run_command": {
      // Can't truly run shell commands from a browser — explain + suggest
      return `Shell command execution requires the LONNIE desktop agent. Install it with:\n\nnpm i -g lonnie-agent\nlonnie-agent start\n\nThen restart this app to unlock shell access.`;
    }

    case "summarize": {
      // Pass-through — model does the summarization
      return `Ready to summarize. Content: ${JSON.stringify(args.content || "").slice(0, 3000)}`;
    }

    case "translate": {
      return `Translation request — from: ${args.from || "auto"}, to: ${args.to || "en"}, text: "${String(args.text || "").slice(0, 500)}"`;
    }

    case "analyze_image": {
      return `Image analysis — vision models require a multimodal Ollama model (e.g. llava). Attach an image to your message to analyze it.`;
    }

    case "generate_image": {
      return `Image generation not built into Ollama by default. Consider Stable Diffusion via automatic1111 API or DALL-E via OpenAI.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// Parse tool calls from model output (simple JSON detection)
export function parseToolCall(
  text: string
): { tool: ToolName; args: Record<string, unknown> } | null {
  const match = text.match(/```(?:json)?\s*(\{[\s\S]*?"tool"[\s\S]*?\})\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.tool && ALL_TOOLS.some((t) => t.name === parsed.tool)) {
      return { tool: parsed.tool, args: parsed.args || {} };
    }
  } catch {}
  return null;
}
