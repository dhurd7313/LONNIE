import { memory } from "@/lib/memory";

export type ToolName =
  | "get_time" | "web_search" | "open_url" | "http_request" | "fetch_image"
  | "read_file" | "write_file" | "list_directory"
  | "get_clipboard" | "set_clipboard" | "send_notification"
  | "memory_store" | "memory_recall" | "memory_list" | "memory_delete" | "memory_search" | "memory_export"
  | "send_email" | "create_calendar_event"
  | "run_js" | "get_battery" | "get_geolocation" | "take_screenshot";

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
  { name: "get_time",              label: "Clock & Time",      description: "Current time, date, timezone",                emoji: "🕐", category: "system",  enabledByDefault: true },
  { name: "run_js",                label: "Run JavaScript",     description: "Execute JS — math, logic, data",              emoji: "⚡", category: "system",  enabledByDefault: true },
  { name: "get_clipboard",         label: "Read Clipboard",     description: "Read clipboard text",                         emoji: "📋", category: "system",  enabledByDefault: true, requiresGrant: true },
  { name: "set_clipboard",         label: "Write Clipboard",    description: "Copy text to clipboard",                      emoji: "📌", category: "system",  enabledByDefault: true },
  { name: "send_notification",     label: "Notifications",      description: "Send desktop notification",                   emoji: "🔔", category: "system",  enabledByDefault: true, requiresGrant: true },
  { name: "get_battery",           label: "Battery Status",     description: "Device battery & charging state",             emoji: "🔋", category: "system",  enabledByDefault: true },
  { name: "get_geolocation",       label: "Geolocation",        description: "Current GPS coordinates",                     emoji: "📍", category: "system",  enabledByDefault: false, requiresGrant: true },
  { name: "take_screenshot",       label: "Screenshot",         description: "Capture screen",                              emoji: "📷", category: "system",  enabledByDefault: false, requiresGrant: true },
  { name: "web_search",            label: "Web Search",         description: "Open browser search tab",                     emoji: "🔍", category: "web",     enabledByDefault: true },
  { name: "fetch_image",           label: "Fetch Image",        description: "Retrieve and display an image inline",        emoji: "🖼️", category: "web",     enabledByDefault: true },
  { name: "open_url",              label: "Open URL",           description: "Open a URL in browser tab",                   emoji: "🔗", category: "web",     enabledByDefault: true },
  { name: "http_request",          label: "HTTP Request",       description: "GET/POST any URL or REST API",                emoji: "🌐", category: "web",     enabledByDefault: true },
  { name: "read_file",             label: "Read File",          description: "Open & read a local file",                    emoji: "📄", category: "files",   enabledByDefault: true, requiresGrant: true },
  { name: "write_file",            label: "Save File",          description: "Create/save a file to disk",                  emoji: "💾", category: "files",   enabledByDefault: true },
  { name: "list_directory",        label: "Browse Folder",      description: "List local folder contents",                  emoji: "📁", category: "files",   enabledByDefault: true, requiresGrant: true },
  { name: "memory_store",          label: "Store Memory",       description: "Persist a fact to IndexedDB permanently",     emoji: "🧠", category: "memory",  enabledByDefault: true },
  { name: "memory_recall",         label: "Recall Memory",      description: "Look up a stored memory by key",              emoji: "💭", category: "memory",  enabledByDefault: true },
  { name: "memory_list",           label: "List Memories",      description: "Show all stored memories",                    emoji: "🗂️", category: "memory",  enabledByDefault: true },
  { name: "memory_delete",         label: "Forget Memory",      description: "Delete a memory by key",                      emoji: "🗑️", category: "memory",  enabledByDefault: true },
  { name: "memory_search",         label: "Search Memories",    description: "Full-text search across all memories",        emoji: "🔎", category: "memory",  enabledByDefault: true },
  { name: "memory_export",         label: "Export Memories",    description: "Download all memories as JSON file",          emoji: "📤", category: "memory",  enabledByDefault: true },
  { name: "send_email",            label: "Send Email",         description: "Open mail client to compose email",           emoji: "📧", category: "comms",   enabledByDefault: true },
  { name: "create_calendar_event", label: "Calendar Event",     description: "Add event to Google Calendar",                emoji: "📅", category: "comms",   enabledByDefault: true },
];

export interface ImageResult {
  type: "image";
  url: string;
  query: string;
  source: string;
}

export async function executeTool(name: ToolName, args: Record<string, unknown>): Promise<string | ImageResult> {
  switch (name) {

    case "get_time": {
      const n = new Date();
      return JSON.stringify({
        iso: n.toISOString(),
        local: n.toLocaleString(),
        date: n.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" }),
        time: n.toLocaleTimeString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        unix: Math.floor(n.getTime() / 1000),
      }, null, 2);
    }

    case "run_js": {
      const code = String(args.code ?? "");
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(`"use strict"; return (async () => { ${code} })()`);
        const result = await fn();
        if (result === undefined) return "(no return value)";
        return typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
      } catch (e: any) { return `RuntimeError: ${e.message}`; }
    }

    case "get_battery": {
      const bat = await (navigator as any).getBattery?.().catch(() => null);
      if (!bat) return "Battery API not supported.";
      return JSON.stringify({ level: `${Math.round(bat.level * 100)}%`, charging: bat.charging }, null, 2);
    }

    case "get_geolocation": return new Promise(resolve => {
      if (!navigator.geolocation) { resolve("Not supported."); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve(JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: `${p.coords.accuracy}m` }, null, 2)),
        e => resolve(`Denied: ${e.message}`)
      );
    });

    case "get_clipboard": {
      try { return (await navigator.clipboard.readText()) || "(empty)"; }
      catch { return "Permission denied — click on the page first."; }
    }

    case "set_clipboard": {
      try { await navigator.clipboard.writeText(String(args.text ?? "")); return `Copied ${String(args.text ?? "").length} chars.`; }
      catch { return "Clipboard write failed."; }
    }

    case "send_notification": {
      const title = String(args.title ?? "LONNIE"), body = String(args.body ?? "");
      if (!("Notification" in window)) return "Not supported.";
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission === "granted") { new Notification(title, { body, icon: "/favicon.ico" }); return `Sent: "${title}"`; }
      return "Notification permission denied.";
    }

    case "take_screenshot": {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: "monitor" } });
        const track = stream.getVideoTracks()[0];
        const ic = new (window as any).ImageCapture(track);
        const bm = await ic.grabFrame(); track.stop();
        const c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height;
        c.getContext("2d")!.drawImage(bm, 0, 0);
        const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `screenshot-${Date.now()}.png`; a.click();
        return `Captured ${bm.width}×${bm.height} — downloading.`;
      } catch (e: any) { return e.name === "AbortError" ? "Cancelled." : `Failed: ${e.message}`; }
    }

    case "web_search": {
      const q = String(args.query ?? args.q ?? "");
      const e = String(args.engine ?? "duckduckgo").toLowerCase();
      const urls: Record<string, string> = {
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        google:     `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        perplexity: `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
        youtube:    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        github:     `https://github.com/search?q=${encodeURIComponent(q)}`,
        yelp:       `https://www.yelp.com/search?find_desc=${encodeURIComponent(q)}`,
        maps:       `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
      };
      const url = urls[e] ?? urls.duckduckgo;
      window.open(url, "_blank", "noopener");
      return `Opened "${q}" on ${e}.`;
    }

    case "open_url": {
      const url = String(args.url ?? "");
      if (!url.startsWith("http")) return `Invalid URL: ${url}`;
      window.open(url, "_blank", "noopener");
      return `Opened: ${url}`;
    }

    case "http_request": {
      const { url, method = "GET", headers = {}, body } = args as any;
      if (!url) return "Error: url required.";
      try {
        const r = await fetch(url, {
          method,
          headers: { "Accept": "text/html,application/json,*/*", ...headers as object },
          body: body ? JSON.stringify(body) : undefined,
        });
        const contentType = r.headers.get("content-type") ?? "";
        const text = await r.text();
        // Strip heavy HTML down to readable text
        const cleaned = contentType.includes("html")
          ? text
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s{3,}/g, "\n")
              .trim()
              .slice(0, 6000)
          : text.slice(0, 6000);
        return `HTTP ${r.status}\n\n${cleaned}${text.length > 6000 ? "\n…(truncated)" : ""}`;
      } catch (e: any) { return `Request failed: ${e.message}`; }
    }

    case "fetch_image": {
      const query = String(args.query ?? args.q ?? "").trim();
      if (!query) return "Need a query.";
      try {
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (searchRes.ok) {
          const sd = await searchRes.json();
          const title = sd?.query?.search?.[0]?.title;
          if (title) {
            const pr = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(5000) });
            if (pr.ok) {
              const pd = await pr.json();
              if (pd?.thumbnail?.source) {
                return { type: "image", url: pd.thumbnail.source.replace(/\/\d+px-/, "/800px-"), query, source: `Wikipedia: ${title}` };
              }
            }
          }
        }
      } catch {}
      try {
        const cr = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*&gsrlimit=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (cr.ok) {
          const cd = await cr.json();
          const pages = cd?.query?.pages;
          if (pages) {
            const first = Object.values(pages)[0] as any;
            const url = first?.imageinfo?.[0]?.thumburl;
            if (url) return { type: "image", url, query, source: "Wikimedia Commons" };
          }
        }
      } catch {}
      return { type: "image", url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}&${Date.now()}`, query, source: "Unsplash" };
    }

    case "read_file": {
      try {
        const [h] = await (window as any).showOpenFilePicker({ multiple: false });
        const f = await h.getFile(); const t = await f.text();
        return `${f.name} (${(f.size / 1024).toFixed(1)} KB)\n\n${t.slice(0, 12000)}${t.length > 12000 ? "\n…(truncated)" : ""}`;
      } catch (e: any) { return e.name === "AbortError" ? "Cancelled." : `Failed: ${e.message}`; }
    }

    case "write_file": {
      const fname = String(args.filename ?? "output.txt"), content = String(args.content ?? "");
      try {
        const h = await (window as any).showSaveFilePicker({ suggestedName: fname });
        const w = await h.createWritable(); await w.write(content); await w.close();
        return `Saved: ${h.name}`;
      } catch (e: any) { return e.name === "AbortError" ? "Cancelled." : `Failed: ${e.message}`; }
    }

    case "list_directory": {
      try {
        const h = await (window as any).showDirectoryPicker({ mode: "read" });
        const entries: string[] = [];
        for await (const [name, e] of (h as any).entries())
          entries.push(`${e.kind === "directory" ? "📁" : "📄"} ${name}`);
        return `${h.name}/\n${entries.sort().join("\n") || "(empty)"}`;
      } catch (e: any) { return e.name === "AbortError" ? "Cancelled." : `Failed: ${e.message}`; }
    }

    case "memory_store": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Need a key.";
      await memory.set(key, args.value, args.note ? String(args.note) : undefined, Array.isArray(args.tags) ? args.tags as string[] : undefined);
      return `Stored: "${key}"`;
    }

    case "memory_recall": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Need a key.";
      const entry = await memory.get(key);
      if (!entry) return `Nothing stored for "${key}".`;
      return `"${key}" = ${JSON.stringify(entry.value)}\nStored: ${entry.savedAt}`;
    }

    case "memory_list": {
      const all = await memory.getAll();
      if (!all.length) return "Nothing stored yet.";
      return all
        .filter(e => !e.key.startsWith("__"))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(e => `• "${e.key}": ${JSON.stringify(e.value).slice(0, 80)}`)
        .join("\n");
    }

    case "memory_delete": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Need a key.";
      const entry = await memory.get(key);
      if (!entry) return `Not found: "${key}"`;
      await memory.delete(key); return `Forgotten: "${key}"`;
    }

    case "memory_search": {
      const q = String(args.query ?? "").trim();
      if (!q) return "Need a query.";
      const results = await memory.search(q);
      return results.length
        ? results.map(e => `• "${e.key}": ${JSON.stringify(e.value).slice(0, 80)}`).join("\n")
        : `No matches for: "${q}"`;
    }

    case "memory_export": {
      const json = await memory.exportAll();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `lonnie-memories-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      const all = await memory.getAll();
      return `Exported ${all.filter(e => !e.key.startsWith("__")).length} memories.`;
    }

    case "send_email": {
      const { to = "", subject = "", body = "" } = args as any;
      window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      return `Mail client opened — To: ${to || "(you)"}`;
    }

    case "create_calendar_event": {
      const { title = "New Event", start = "", end = "", description = "", location = "" } = args as any;
      const fmt = (d: string) => d.replace(/[-:.TZ]/g, "").slice(0, 15).padEnd(15, "0");
      const p = new URLSearchParams({ action: "TEMPLATE", text: title, details: description, location });
      if (start && end) p.set("dates", `${fmt(start)}/${fmt(end)}`);
      window.open(`https://calendar.google.com/calendar/render?${p}`, "_blank", "noopener");
      return `Calendar opened: "${title}"`;
    }

    default: return `Unknown tool: ${name}`;
  }
}

// Parse tool call from model output — returns null if none found
export function parseToolCall(text: string): { tool: ToolName; args: Record<string, unknown> } | null {
  // Match fenced JSON block containing "tool" key
  const patterns = [
    /```(?:json|tool)?\s*\n?(\{[\s\S]*?"tool"[\s\S]*?\})\s*\n?```/i,
    /^\s*(\{"tool"[\s\S]*?\})\s*$/m,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const o = JSON.parse(match[1]);
        if (o.tool && TOOL_REGISTRY.some(t => t.name === o.tool)) {
          return { tool: o.tool as ToolName, args: o.args ?? {} };
        }
      } catch {}
    }
  }
  return null;
}

// Detect fake execution (model describing instead of doing)
export function detectFakeExecution(text: string): boolean {
  const patterns = [
    /here'?s how i would/i,
    /i would use \w+ to/i,
    /result:\s*(displayed|showed|found|searched|presented)/i,
    /please note.*simulated/i,
    /i am unable to (physically|actually|directly)/i,
    /normalize\s*→/i,
    /map opportunities\s*→/i,
    /select strategy\s*→/i,
    /as lonnie,\s*i have/i,
    /direct execution with available tools/i,
  ];
  return patterns.some(p => p.test(text));
}

// Strip any leaked JSON blocks or GEF narration from final display text
export function sanitizeResponse(text: string): string {
  return text
    .replace(/```(?:json|tool)?\s*\n?\{[\s\S]*?"tool"[\s\S]*?\}\s*\n?```/gi, "")
    .replace(/^\s*\{"tool"[\s\S]*?\}\s*$/gm, "")
    .replace(/Normalize\s*→.*$/gm, "")
    .replace(/Map opportunities\s*→.*$/gm, "")
    .replace(/Select strategy\s*→.*$/gm, "")
    .replace(/Execute\s*→.*$/gm, "")
    .replace(/Track\s*&\s*adapt\s*→.*$/gm, "")
    .replace(/Refine\s*→.*$/gm, "")
    .replace(/Direct execution with available tools\s*/gi, "")
    .replace(/As Lonnie,\s*I have/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Agent tool executors (only active when agent is connected) ─────────────────
import { agent } from "@/lib/localAgent";

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>
): Promise<string | ImageResult> {

  if (!agent.connected) {
    return `Agent not connected. Start lonnie-agent on your machine and configure it in the sidebar Agent panel.`;
  }

  switch (name) {
    case "agent_exec": {
      const cmd = String(args.command ?? "");
      const cwd = args.cwd ? String(args.cwd) : undefined;
      const result = await agent.exec(cmd, cwd);
      return result.combined || result.error || "(no output)";
    }

    case "agent_screenshot": {
      const ss = await agent.screenshot();
      if (!ss) return "Screenshot failed.";
      return { type: "image", url: `data:${ss.mimeType};base64,${ss.base64}`, query: "desktop screenshot", source: "Local Agent" };
    }

    case "agent_docker_ps": {
      const containers = await agent.getDockerContainers();
      if (!containers.length) return "No Docker containers found.";
      return containers.map(c =>
        `${c.Names?.replace(/^\//, "")} — ${c.Image} — ${c.State} (${c.Status})${c.Ports ? " | ports: " + c.Ports : ""}`
      ).join("\n");
    }

    case "agent_docker_action": {
      const { action, container } = args as { action: string; container: string };
      return await agent.dockerAction(action, container);
    }

    case "agent_read_file": {
      const filePath = String(args.path ?? "");
      return await agent.readFile(filePath);
    }

    case "agent_write_file": {
      const { path: fp, content } = args as { path: string; content: string };
      await agent.writeFile(fp, content);
      return `Written: ${fp}`;
    }

    case "agent_list_dir": {
      const entries = await agent.listDir(String(args.path ?? ""));
      return entries.map(e => `${e.type === "dir" ? "📁" : "📄"} ${e.name}`).join("\n");
    }

    case "agent_system_info": {
      const info = await agent.getSystemInfo();
      return JSON.stringify(info, null, 2);
    }

    case "agent_processes": {
      return await agent.getProcesses();
    }

    case "agent_clipboard_read": {
      return await agent.getClipboard();
    }

    case "agent_clipboard_write": {
      await agent.setClipboard(String(args.text ?? ""));
      return "Clipboard updated.";
    }

    default:
      return `Unknown agent tool: ${name}`;
  }
}

export const AGENT_TOOL_REGISTRY = [
  { name: "agent_exec",           description: "Run any terminal/PowerShell command on the desktop" },
  { name: "agent_screenshot",     description: "Take a real screenshot of the entire desktop" },
  { name: "agent_docker_ps",      description: "List all Docker containers with status" },
  { name: "agent_docker_action",  description: "Start, stop, restart, or get logs of a Docker container" },
  { name: "agent_read_file",      description: "Read any file from the local filesystem by path" },
  { name: "agent_write_file",     description: "Write content to any file path on disk" },
  { name: "agent_list_dir",       description: "List files and folders in any directory" },
  { name: "agent_system_info",    description: "Get CPU, RAM, platform, and system details" },
  { name: "agent_processes",      description: "List running processes" },
  { name: "agent_clipboard_read", description: "Read the real desktop clipboard" },
  { name: "agent_clipboard_write","description": "Write text to the real desktop clipboard" },
];
