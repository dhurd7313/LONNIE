import { memory } from "@/lib/memory";

export type ToolName =
  | "get_time" | "web_search" | "open_url" | "http_request" | "fetch_image"
  | "read_file" | "write_file" | "list_directory"
  | "get_clipboard" | "set_clipboard" | "send_notification"
  | "memory_store" | "memory_recall" | "memory_list" | "memory_delete"
  | "memory_search" | "memory_export"
  | "send_email" | "create_calendar_event"
  | "run_js" | "get_battery" | "get_geolocation" | "take_screenshot"
  | "add_skill" | "list_skills";

export interface ToolDef {
  name: ToolName;
  label: string;
  description: string;
  emoji: string;
  category: "system" | "web" | "files" | "memory" | "comms" | "skills";
  enabledByDefault: boolean;
  requiresGrant?: boolean;
}

export const TOOL_REGISTRY: ToolDef[] = [
  { name: "get_time",              label: "Clock & Time",      description: "Current time, date, day, timezone",           emoji: "🕐", category: "system",  enabledByDefault: true },
  { name: "run_js",                label: "Run JavaScript",     description: "Execute JS code and return output",            emoji: "⚡", category: "system",  enabledByDefault: true },
  { name: "get_clipboard",         label: "Read Clipboard",     description: "Read the current clipboard text",             emoji: "📋", category: "system",  enabledByDefault: true, requiresGrant: true },
  { name: "set_clipboard",         label: "Write Clipboard",    description: "Copy text to clipboard",                      emoji: "📌", category: "system",  enabledByDefault: true },
  { name: "send_notification",     label: "Notifications",      description: "Send a desktop notification",                 emoji: "🔔", category: "system",  enabledByDefault: true, requiresGrant: true },
  { name: "get_battery",           label: "Battery Status",     description: "Device battery level and charging state",     emoji: "🔋", category: "system",  enabledByDefault: true },
  { name: "get_geolocation",       label: "Geolocation",        description: "Current GPS coordinates",                     emoji: "📍", category: "system",  enabledByDefault: false, requiresGrant: true },
  { name: "take_screenshot",       label: "Screenshot",         description: "Capture the browser tab (not full desktop — use agent for full screen)", emoji: "📷", category: "system", enabledByDefault: false, requiresGrant: true },
  { name: "web_search",            label: "Web Search",         description: "Open a real browser search tab with results", emoji: "🔍", category: "web",     enabledByDefault: true },
  { name: "fetch_image",           label: "Fetch Image",        description: "Retrieve and display an image inline. Args: query (required, be specific)", emoji: "🖼️", category: "web", enabledByDefault: true },
  { name: "open_url",              label: "Open URL",           description: "Open any URL in a new browser tab",           emoji: "🔗", category: "web",     enabledByDefault: true },
  { name: "http_request",          label: "HTTP Request",       description: "Make GET/POST to any URL and return response. Args: url (required)", emoji: "🌐", category: "web", enabledByDefault: true },
  { name: "read_file",             label: "Read File",          description: "Open and read a local file",                  emoji: "📄", category: "files",   enabledByDefault: true, requiresGrant: true },
  { name: "write_file",            label: "Save File",          description: "Save content to a file. Args: filename, content", emoji: "💾", category: "files", enabledByDefault: true },
  { name: "list_directory",        label: "Browse Folder",      description: "List contents of a local folder",             emoji: "📁", category: "files",   enabledByDefault: true, requiresGrant: true },
  { name: "memory_store",          label: "Store Memory",       description: "Save a fact permanently. Args: key (descriptive string), value", emoji: "🧠", category: "memory", enabledByDefault: true },
  { name: "memory_recall",         label: "Recall Memory",      description: "Look up stored info by key. Args: key",       emoji: "💭", category: "memory",  enabledByDefault: true },
  { name: "memory_list",           label: "List Memories",      description: "Show all stored memories",                    emoji: "🗂️", category: "memory",  enabledByDefault: true },
  { name: "memory_delete",         label: "Forget Memory",      description: "Delete a memory. Args: key",                  emoji: "🗑️", category: "memory",  enabledByDefault: true },
  { name: "memory_search",         label: "Search Memories",    description: "Search memories by text. Args: query",        emoji: "🔎", category: "memory",  enabledByDefault: true },
  { name: "memory_export",         label: "Export Memories",    description: "Download all memories as JSON",               emoji: "📤", category: "memory",  enabledByDefault: true },
  { name: "send_email",            label: "Send Email",         description: "Open mail client. Args: to, subject, body",   emoji: "📧", category: "comms",   enabledByDefault: true },
  { name: "create_calendar_event", label: "Calendar Event",     description: "Add event to Google Calendar",                emoji: "📅", category: "comms",   enabledByDefault: true },
  { name: "add_skill",             label: "Add Skill",          description: "Install a new skill from JSON or text. Args: name, description, systemPrompt, triggerPhrases (array)", emoji: "✨", category: "skills", enabledByDefault: true },
  { name: "list_skills",           label: "List Skills",        description: "Show all installed skills",                   emoji: "📋", category: "skills",  enabledByDefault: true },
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
      return `${n.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} · ${n.toLocaleTimeString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    }

    case "run_js": {
      const code = String(args.code ?? "");
      if (!code.trim()) return "Error: no code provided.";
      // Capture console.log output too
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...a: any[]) => { logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ")); };
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(`"use strict"; return (async () => { ${code} })()`);
        const result = await fn();
        console.log = origLog;
        const logOutput = logs.length ? logs.join("\n") : "";
        if (result === undefined && logOutput) return logOutput;
        if (result === undefined) return "(no return value — use \'return\' to get output, or console.log())";
        const resultStr = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
        return logOutput ? logOutput + "\n" + resultStr : resultStr;
      } catch (e: any) {
        console.log = origLog;
        return `RuntimeError: ${e.message}`;
      }
    }

    case "get_battery": {
      const bat = await (navigator as any).getBattery?.().catch(() => null);
      if (!bat) return "Battery API not supported in this browser.";
      return `Battery: ${Math.round(bat.level * 100)}% · ${bat.charging ? "Charging" : "Not charging"}`;
    }

    case "get_geolocation": return new Promise(resolve => {
      if (!navigator.geolocation) { resolve("Geolocation not supported."); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve(`Lat: ${p.coords.latitude.toFixed(5)}, Lng: ${p.coords.longitude.toFixed(5)}, Accuracy: ${p.coords.accuracy.toFixed(0)}m`),
        e => resolve(`Location denied: ${e.message}`)
      );
    });

    case "get_clipboard": {
      try {
        const text = await navigator.clipboard.readText();
        return text.trim() || "(clipboard is empty)";
      } catch {
        return "Clipboard read denied — click somewhere on the page first, then try again.";
      }
    }

    case "set_clipboard": {
      const text = String(args.text ?? "");
      if (!text) return "Error: no text provided.";
      try {
        await navigator.clipboard.writeText(text);
        return `Copied to clipboard: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`;
      } catch { return "Clipboard write failed."; }
    }

    case "send_notification": {
      const title = String(args.title ?? "LONNIE");
      const body = String(args.body ?? "");
      if (!("Notification" in window)) return "Notifications not supported in this browser.";
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
        return `Notification sent: "${title}"`;
      }
      return "Notification permission denied by user.";
    }

    case "take_screenshot": {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const cap = new (window as any).ImageCapture(track);
        const bm = await cap.grabFrame();
        track.stop();
        const c = document.createElement("canvas");
        c.width = bm.width; c.height = bm.height;
        c.getContext("2d")!.drawImage(bm, 0, 0);
        const a = document.createElement("a");
        a.href = c.toDataURL("image/png");
        a.download = `screenshot-${Date.now()}.png`;
        a.click();
        return `Screenshot captured (${bm.width}×${bm.height}) — downloaded.`;
      } catch (e: any) {
        return e.name === "AbortError"
          ? "Screenshot cancelled."
          : `Browser screenshot only captures this tab. For full desktop screenshots, connect the LONNIE local agent (⚡ Agent tab in sidebar).`;
      }
    }

    case "web_search": {
      const q = String(args.query ?? args.q ?? "").trim();
      if (!q) return "Error: query is required. Example: {\"tool\":\"web_search\",\"args\":{\"query\":\"best Italian restaurants NYC\"}}";
      const engine = String(args.engine ?? "duckduckgo").toLowerCase();
      const urls: Record<string, string> = {
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        google:     `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        perplexity: `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
        youtube:    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        github:     `https://github.com/search?q=${encodeURIComponent(q)}`,
        yelp:       `https://www.yelp.com/search?find_desc=${encodeURIComponent(q)}`,
        imdb:       `https://www.imdb.com/find?q=${encodeURIComponent(q)}`,
        maps:       `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
      };
      const url = urls[engine] ?? urls.duckduckgo;
      window.open(url, "_blank", "noopener");
      return `Opened ${engine} search for: "${q}" — results are in the new browser tab that just opened.`;
    }

    case "open_url": {
      const url = String(args.url ?? "").trim();
      if (!url) return "Error: url is required.";
      if (!url.startsWith("http")) return `Invalid URL: "${url}" — must start with https://`;
      window.open(url, "_blank", "noopener");
      return `Opened: ${url}`;
    }

    case "http_request": {
      const url = String(args.url ?? "").trim();
      if (!url) return "Error: url is required. Provide a real URL to fetch.";
      const method = String(args.method ?? "GET").toUpperCase();
      const customHeaders = (args.headers ?? {}) as Record<string, string>;
      const body = args.body;
      try {
        const res = await fetch(url, {
          method,
          headers: { "Accept": "text/html,application/json,*/*", "User-Agent": "Mozilla/5.0", ...customHeaders },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(15000),
        });
        const contentType = res.headers.get("content-type") ?? "";
        const raw = await res.text();
        const text = contentType.includes("html")
          ? raw
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s{3,}/g, "\n")
              .trim()
              .slice(0, 5000)
          : raw.slice(0, 5000);
        return `HTTP ${res.status} from ${url}\n\n${text}${raw.length > 5000 ? "\n…(truncated)" : ""}`;
      } catch (e: any) {
        return `Request failed: ${e.message}. Note: many URLs block browser requests due to CORS. For unrestricted access use the local agent (agent_exec with curl).`;
      }
    }

    case "fetch_image": {
      // Accept any of these arg names the model might use
      const query = String(
        args.query ?? args.q ?? args.search ?? args.term ?? args.subject ?? args.topic ?? ""
      ).trim();

      if (!query) {
        return "Error: fetch_image needs a query. Example: {\"tool\":\"fetch_image\",\"args\":{\"query\":\"Times Square New York night\"}}";
      }

      // Strategy 1: Wikipedia article thumbnail (best for landmarks, people, places)
      try {
        const sr = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (sr.ok) {
          const sd = await sr.json();
          const hits: any[] = sd?.query?.search ?? [];
          for (const hit of hits) {
            const pr = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (pr.ok) {
              const pd = await pr.json();
              const imgUrl = pd?.originalimage?.source ?? (pd?.thumbnail?.source ? pd.thumbnail.source.replace(/\/\d+px-/, "/1200px-") : null);
              if (imgUrl) return { type: "image", url: imgUrl, query, source: `Wikipedia: ${hit.title}` };
            }
          }
        }
      } catch {}

      // Strategy 2: Wikimedia Commons
      try {
        const cr = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*&gsrlimit=5`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (cr.ok) {
          const cd = await cr.json();
          const pages = Object.values(cd?.query?.pages ?? {}) as any[];
          for (const p of pages) {
            const url = (p as any)?.imageinfo?.[0]?.thumburl || (p as any)?.imageinfo?.[0]?.url;
            if (url) return { type: "image", url, query, source: "Wikimedia Commons" };
          }
        }
      } catch {}

      // Strategy 3: Loremflickr (keyword-based real photos)
      const safeQuery = query.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, ",").slice(0, 60);
      const flickrUrl = `https://loremflickr.com/800/600/${encodeURIComponent(safeQuery)}?lock=${Math.floor(Math.random()*100)}`;
      return { type: "image", url: flickrUrl, query, source: "Loremflickr" };
    }

    case "read_file": {
      try {
        const [h] = await (window as any).showOpenFilePicker({ multiple: false });
        const f = await h.getFile();
        const t = await f.text();
        return `File: ${f.name} (${(f.size / 1024).toFixed(1)} KB)\n\n${t.slice(0, 12000)}${t.length > 12000 ? "\n…(truncated at 12K chars)" : ""}`;
      } catch (e: any) {
        return e.name === "AbortError" ? "File picker cancelled." : `Read failed: ${e.message}`;
      }
    }

    case "write_file": {
      const fname = String(args.filename ?? args.file_path ?? "output.txt");
      const content = String(args.content ?? "");
      if (!content) return "Error: content is required.";
      try {
        const h = await (window as any).showSaveFilePicker({ suggestedName: fname });
        const w = await h.createWritable();
        await w.write(content);
        await w.close();
        return `Saved "${h.name}" (${(content.length / 1024).toFixed(1)} KB)`;
      } catch (e: any) {
        return e.name === "AbortError" ? "Save cancelled." : `Write failed: ${e.message}`;
      }
    }

    case "list_directory": {
      try {
        const h = await (window as any).showDirectoryPicker({ mode: "read" });
        const entries: string[] = [];
        for await (const [name, e] of (h as any).entries())
          entries.push(`${e.kind === "directory" ? "📁" : "📄"} ${name}`);
        return `${h.name}/\n${entries.sort().join("\n") || "(empty)"}`;
      } catch (e: any) {
        return e.name === "AbortError" ? "Cancelled." : `Failed: ${e.message}`;
      }
    }

    case "memory_store": {
      const key = String(args.key ?? "").trim();
      const value = args.value;
      if (!key) return "Error: key is required. Use a descriptive name like 'operator_name' or 'project_status'.";
      if (value === undefined) return "Error: value is required.";
      await memory.set(key, value, args.note ? String(args.note) : undefined);
      return `Stored → "${key}": ${JSON.stringify(value).slice(0, 100)}`;
    }

    case "memory_recall": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Error: key is required. Use memory_list to see available keys.";
      const entry = await memory.get(key);
      if (!entry) return `Nothing found for "${key}". Use memory_list to see what's stored.`;
      return `"${key}" = ${JSON.stringify(entry.value)}\nStored: ${entry.savedAt}`;
    }

    case "memory_list": {
      const all = await memory.getAll();
      const visible = all.filter(e => !e.key.startsWith("__"));
      if (!visible.length) return "No memories stored yet.";
      return visible
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(e => `• "${e.key}": ${JSON.stringify(e.value).slice(0, 80)}`)
        .join("\n");
    }

    case "memory_delete": {
      const key = String(args.key ?? "").trim();
      if (!key) return "Error: key is required.";
      const entry = await memory.get(key);
      if (!entry) return `Not found: "${key}"`;
      await memory.delete(key);
      return `Deleted: "${key}"`;
    }

    case "memory_search": {
      const q = String(args.query ?? "").trim();
      if (!q) return "Error: query is required.";
      const results = await memory.search(q);
      if (!results.length) return `No memories match: "${q}"`;
      return results.map(e => `• "${e.key}": ${JSON.stringify(e.value).slice(0, 80)}`).join("\n");
    }

    case "memory_export": {
      const all = await memory.getAll();
      const json = JSON.stringify(all, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `lonnie-memories-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      return `Exported ${all.filter(e => !e.key.startsWith("__")).length} memories to file.`;
    }

    case "send_email": {
      const { to = "", subject = "", body = "" } = args as any;
      window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      return `Email client opened — To: ${to || "(you)"}, Subject: "${subject}"`;
    }

    case "create_calendar_event": {
      const { title = "New Event", start = "", end = "", description = "", location = "" } = args as any;
      const fmt = (d: string) => d.replace(/[-:.TZ]/g, "").slice(0, 15).padEnd(15, "0");
      const p = new URLSearchParams({ action: "TEMPLATE", text: title, details: description, location });
      if (start && end) p.set("dates", `${fmt(start)}/${fmt(end)}`);
      window.open(`https://calendar.google.com/calendar/render?${p}`, "_blank", "noopener");
      return `Google Calendar opened for: "${title}"`;
    }

    case "add_skill": {
      const { skills } = await import("@/lib/skills");
      await skills.load();
      const name = String(args.name ?? "Unnamed Skill");
      const description = String(args.description ?? "");
      const systemPrompt = String(args.systemPrompt ?? args.system_prompt ?? args.prompt ?? "");
      const triggerPhrases = Array.isArray(args.triggerPhrases)
        ? args.triggerPhrases as string[]
        : String(args.triggerPhrases ?? name.toLowerCase()).split(",").map((s: string) => s.trim());
      const rawJson = args.raw ? JSON.stringify(args) : undefined;
      const skill = await skills.ingestFromText(
        rawJson ?? JSON.stringify({ meta: { title: name, description }, config: { systemRole: systemPrompt }, triggerPhrases })
      );
      return `Skill installed: "${skill.name}"\nTriggers: ${skill.triggerPhrases.join(", ")}\nFind it in the Skills tab (✦) in the sidebar.`;
    }

    case "list_skills": {
      const { skills } = await import("@/lib/skills");
      await skills.load();
      const all = skills.getAll();
      if (!all.length) return "No skills installed.";
      return all.map(s => `${s.active ? "✓" : "○"} ${s.name} — ${s.description.slice(0, 60)} | triggers: ${s.triggerPhrases.slice(0, 3).join(", ")}`).join("\n");
    }

    default: return `Unknown tool: ${name as string}`;
  }
}

// ── Parse tool call from model output ─────────────────────────────────────────
export function parseToolCall(text: string): { tool: ToolName; args: Record<string, unknown> } | null {
  const patterns = [
    // Fenced block: ```json\n{...}\n```
    /```(?:json|tool)?\s*\n?(\{[\s\S]*?"tool"\s*:[\s\S]*?\})\s*\n?```/i,
    // Inline bare JSON on its own line: {"tool":"...","args":{...}}
    /^\s*(\{"tool"\s*:[\s\S]*?\})\s*$/m,
    // Partial: just a JSON object anywhere containing "tool"
    /(\{"tool"\s*:\s*"[^"]+"\s*,\s*"args"\s*:\s*\{[\s\S]*?\}\s*\})/,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (!m) continue;
    try {
      const o = JSON.parse(m[1]);
      if (typeof o.tool === "string") {
        // Accept agent tools too
        const isBuiltin = TOOL_REGISTRY.some(t => t.name === o.tool);
        const isAgent   = (o.tool as string).startsWith("agent_");
        if (isBuiltin || isAgent) {
          return { tool: o.tool as ToolName, args: o.args ?? {} };
        }
      }
    } catch {}
  }
  return null;
}

// ── Detect fake/simulated execution ───────────────────────────────────────────
export function detectFakeExecution(text: string): boolean {
  return [
    /here'?s how i would/i,
    /i would use \w+ to/i,
    /result:\s*(displayed|showed|found|searched|presented)/i,
    /i apologize.*cannot/i,
    /normalize\s*[→\-]/i,
    /map opportunities/i,
    /select strategy/i,
    /as lonnie,?\s*i have/i,
    /direct execution with available tools/i,
    /let'?s try another approach/i,
    /could you please provide/i,
  ].some(p => p.test(text));
}

// ── Strip leaked JSON and GEF narration from display text ─────────────────────
export function sanitizeResponse(text: string): string {
  return text
    // Remove fenced JSON tool blocks (```json {...} ```)
    .replace(/```(?:json|tool)?\s*\n?\{[\s\S]*?"tool"[\s\S]*?\}\s*\n?```/gi, "")
    // Remove bare inline JSON with "tool" key anywhere on a line
    .replace(/^[\s\t]*\{[\s\S]*?"tool"\s*:[\s\S]*?\}[\s\t]*$/gm, "")
    // Remove single-line compact JSON tool objects
    .replace(/\{"tool"\s*:[^}]+\}/g, "")
    // Remove GEF narration lines
    .replace(/^(Normalize|Map opportunities|Select strategy|Execute|Track & adapt|Refine|Direct execution with available tools)[^\n]*/gm, "")
    // Remove "As Lonnie, I have..."
    .replace(/As Lonnie,?\s*I have[^.]*\./gi, "")
    // Remove common apology/failure boilerplate
    .replace(/I apologize for (any confusion|the inconvenience)[^.]*\./gi, "")
    .replace(/I tried .{0,60} but .{0,80} failed[^.]*\./gi, "")
    .replace(/It seems (that )?there (might|may|could) be (some |an )?issue[^.]*\./gi, "")
    // Remove "I hope this..." filler
    .replace(/I hope this (helps|meets|captures|demonstrates|clarifies)[^.]*\./gi, "")
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Agent tool registry v2 (Git, HuggingFace, Docker, workspace) ──────────────
export const AGENT_TOOL_REGISTRY = [
  // Terminal
  { name: "agent_exec",              description: "Run any terminal/PowerShell command. args: command, cwd (optional)" },
  { name: "agent_exec_batch",        description: "Run multiple commands sequentially. args: commands (array), cwd" },
  // Screenshots
  { name: "agent_screenshot",        description: "Capture the FULL desktop as an image (all windows, Docker, etc)" },
  // Git
  { name: "agent_git_clone",         description: "Clone a GitHub/GitLab repo. args: url, dest (optional), branch (optional), depth (default 1)" },
  { name: "agent_git_status",        description: "Get git status and recent commits. args: path" },
  { name: "agent_git_pull",          description: "Pull latest changes. args: path" },
  // HuggingFace
  { name: "agent_hf_search",         description: "Search HuggingFace for models. args: query, limit (default 8), filter (optional, e.g. text-generation)" },
  { name: "agent_hf_info",           description: "Get info about a HuggingFace model. args: model (e.g. microsoft/phi-2)" },
  { name: "agent_hf_download",       description: "Download a HuggingFace model or file. args: model, filename (optional), dest (optional), token (optional)" },
  // Docker
  { name: "agent_docker_ps",         description: "List all Docker containers with status" },
  { name: "agent_docker_images",     description: "List all Docker images" },
  { name: "agent_docker_action",     description: "Control a container: start/stop/restart/logs/rm. args: action, container" },
  { name: "agent_docker_run",        description: "Run a new Docker container. args: image, name, ports (array), volumes (array), env (array), command, detach" },
  { name: "agent_docker_build",      description: "Build a Docker image from a Dockerfile. args: path, tag, dockerfile" },
  { name: "agent_docker_compose",    description: "Run docker compose. args: path (folder with docker-compose.yml), action (up/down/restart/logs)" },
  { name: "agent_docker_pull",       description: "Pull a Docker image. args: image" },
  // Workspace
  { name: "agent_workspace",         description: "List the LONNIE workspace folder (~/lonnie-workspace)" },
  // Filesystem
  { name: "agent_read_file",         description: "Read any file by absolute path. args: path" },
  { name: "agent_write_file",        description: "Write content to any path. args: path, content" },
  { name: "agent_list_dir",          description: "List directory contents. args: path" },
  { name: "agent_delete_file",       description: "Delete a file or folder. args: path, recursive (bool)" },
  // System
  { name: "agent_system_info",       description: "CPU, RAM, OS, installed tools (git, docker, python, node)" },
  { name: "agent_processes",         description: "List running processes sorted by CPU" },
  // Clipboard
  { name: "agent_clipboard_read",    description: "Read the real system clipboard" },
  { name: "agent_clipboard_write",   description: "Write to the real system clipboard. args: text" },
];

// ── Agent tool executor v2 ─────────────────────────────────────────────────────
export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>
): Promise<string | ImageResult> {

  if (!agent.connected) {
    return `Desktop agent offline. Open the ⚡ Agent tab in the sidebar to connect it.`;
  }

  switch (name) {

    // ── Terminal ──────────────────────────────────────────────────────────────
    case "agent_exec": {
      const cmd = String(args.command ?? args.cmd ?? "");
      if (!cmd) return "Error: command is required.";
      const r = await agent.exec(cmd, args.cwd ? String(args.cwd) : undefined,
        args.timeout ? Number(args.timeout) : 120000);
      if (r.ok) return r.combined || r.stdout || "(no output)";
      return `Command failed:\n${r.combined || r.error}`;
    }

    case "agent_exec_batch": {
      const commands = Array.isArray(args.commands) ? args.commands as string[] : [String(args.commands)];
      const r = await agent.execBatch(commands, args.cwd ? String(args.cwd) : undefined);
      return r.results.map((res: any) =>
        `$ ${res.command}\n${res.ok ? res.combined || res.stdout : "ERROR: " + (res.error || res.combined)}`
      ).join("\n\n");
    }

    // ── Screenshot ────────────────────────────────────────────────────────────
    case "agent_screenshot": {
      const ss = await agent.screenshot();
      if (!ss) return "Screenshot failed. Check agent window for errors.";
      return {
        type: "image",
        url: `data:${ss.mimeType};base64,${ss.base64}`,
        query: "desktop screenshot",
        source: "LONNIE Agent — Full Desktop"
      };
    }

    // ── Git ───────────────────────────────────────────────────────────────────
    case "agent_git_clone": {
      const url = String(args.url ?? "");
      if (!url) return "Error: url is required.";
      const r = await agent.gitClone(
        url,
        args.dest ? String(args.dest) : undefined,
        args.branch ? String(args.branch) : undefined,
        args.depth ? Number(args.depth) : 1
      );
      if (!r.ok) return `Clone failed: ${r.error || r.combined}`;
      const detected = r.detected;
      let summary = `Cloned to: ${r.path}\nFiles: ${r.files?.slice(0, 15).join(", ")}`;
      if (detected.hasDockerCompose) summary += `\n✓ docker-compose.yml found — can run with agent_docker_compose`;
      if (detected.hasDockerfile)    summary += `\n✓ Dockerfile found — can build with agent_docker_build`;
      if (detected.hasRequirements)  summary += `\n✓ requirements.txt — Python project`;
      if (detected.hasPackageJson)   summary += `\n✓ package.json — Node.js project`;
      return summary;
    }

    case "agent_git_status": {
      const dir = String(args.path ?? args.dir ?? "");
      if (!dir) return "Error: path is required.";
      const r = await agent.gitStatus(dir);
      return `Status in ${dir}:\n${r.status || "(clean)"}\n\nRecent commits:\n${r.recentCommits || "(none)"}`;
    }

    case "agent_git_pull": {
      const dir = String(args.path ?? args.dir ?? "");
      if (!dir) return "Error: path is required.";
      const r = await agent.gitPull(dir);
      return r.combined || r.stdout || r.error || "Pull complete.";
    }

    // ── HuggingFace ───────────────────────────────────────────────────────────
    case "agent_hf_search": {
      const q = String(args.query ?? args.q ?? "");
      if (!q) return "Error: query is required.";
      const r = await agent.hfSearch(q, Number(args.limit ?? 8), args.filter ? String(args.filter) : undefined);
      if (!r.ok) return `Search failed: ${r.error}`;
      return r.results.map((m: any) =>
        `• ${m.id} | ${m.pipeline ?? "unknown"} | ↓${(m.downloads/1000).toFixed(0)}k | ❤${m.likes}`
      ).join("\n");
    }

    case "agent_hf_info": {
      const model = String(args.model ?? "");
      if (!model) return "Error: model is required (e.g. microsoft/phi-2).";
      const r = await agent.hfModelInfo(model);
      if (!r.ok) return `Model not found: ${model}`;
      const topFiles = r.files?.slice(0, 8).map((f: any) => `  ${f.name} (${f.size ? (f.size/1024/1024).toFixed(0)+"MB" : "unknown size"})`).join("\n") ?? "";
      return `${r.id}\nPipeline: ${r.pipeline}\nDownloads: ${(r.downloads/1000).toFixed(0)}k | Likes: ${r.likes}\nFiles:\n${topFiles}`;
    }

    case "agent_hf_download": {
      const model = String(args.model ?? "");
      if (!model) return "Error: model is required.";
      const r = await agent.hfDownload(
        model,
        args.filename ? String(args.filename) : undefined,
        args.dest ? String(args.dest) : undefined,
        args.token ? String(args.token) : undefined
      );
      if (!r.ok) return `Download failed: ${r.error || r.combined}`;
      return `Downloaded to: ${r.path}`;
    }

    // ── Docker ────────────────────────────────────────────────────────────────
    case "agent_docker_ps": {
      const r = await agent.dockerPs();
      if (!r.ok) return `Docker unavailable: ${r.error}\nIs Docker Desktop running?`;
      if (!r.containers?.length) return "No containers found. Docker is running but empty.";
      return r.containers.map((c: any) =>
        `${c.State === "running" ? "🟢" : "🔴"} ${(c.Names ?? c.ID).replace(/^\//, "")} | ${c.Image} | ${c.Status}${c.Ports ? " | " + c.Ports : ""}`
      ).join("\n");
    }

    case "agent_docker_images": {
      const r = await agent.dockerImages();
      if (!r.ok) return `Docker unavailable: ${r.error}`;
      if (!r.images?.length) return "No images found.";
      return r.images.map((i: any) =>
        `📦 ${i.Repository}:${i.Tag} | ${i.Size} | ${i.CreatedSince}`
      ).join("\n");
    }

    case "agent_docker_action": {
      const action    = String(args.action ?? "");
      const container = String(args.container ?? "");
      if (!action || !container) return "Error: action and container are required.";
      const r = await agent.dockerAction(action, container, args.options ? String(args.options) : undefined);
      return r.ok ? (r.output || `${action} completed on ${container}`) : `Failed: ${r.output || r.error}`;
    }

    case "agent_docker_run": {
      const image = String(args.image ?? "");
      if (!image) return "Error: image is required.";
      const r = await agent.dockerRun(image, {
        name:    args.name ? String(args.name) : undefined,
        ports:   Array.isArray(args.ports)   ? args.ports as string[] : [],
        volumes: Array.isArray(args.volumes) ? args.volumes as string[] : [],
        env:     Array.isArray(args.env)     ? args.env as string[] : [],
        command: args.command ? String(args.command) : undefined,
        detach:  args.detach !== false,
        options: args.options ? String(args.options) : undefined,
      });
      return r.ok
        ? `Container started: ${r.output?.trim() || "OK"}\nCommand: ${r.command}`
        : `Failed: ${r.output || r.error}`;
    }

    case "agent_docker_build": {
      const buildPath  = String(args.path ?? "");
      const tag        = String(args.tag ?? "");
      if (!buildPath || !tag) return "Error: path and tag are required.";
      const r = await agent.dockerBuild(buildPath, tag,
        args.dockerfile ? String(args.dockerfile) : "Dockerfile",
        Array.isArray(args.args) ? args.args as string[] : []
      );
      return r.ok
        ? `Built image: ${tag}\n${r.output?.slice(-500) ?? ""}`
        : `Build failed:\n${r.output?.slice(-1000) ?? r.error}`;
    }

    case "agent_docker_compose": {
      const composePath = String(args.path ?? "");
      if (!composePath) return "Error: path to folder with docker-compose.yml is required.";
      const action = String(args.action ?? "up");
      const r = await agent.dockerCompose(composePath, action, args.options ? String(args.options) : "");
      return r.ok
        ? `docker compose ${action} complete\n${r.output?.slice(-500) ?? ""}`
        : `Failed:\n${r.output?.slice(-1000) ?? r.error}`;
    }

    case "agent_docker_pull": {
      const image = String(args.image ?? "");
      if (!image) return "Error: image is required.";
      const r = await agent.dockerPull(image);
      return r.ok ? `Pulled: ${image}` : `Failed: ${r.combined || r.error}`;
    }

    // ── Workspace ─────────────────────────────────────────────────────────────
    case "agent_workspace": {
      const r = await agent.getWorkspace();
      if (!r.ok) return `Workspace error: ${r.error}`;
      return `Workspace: ${r.path}\n${r.entries?.map((e: any) => `${e.type === "dir" ? "📁" : "📄"} ${e.name}`).join("\n") || "(empty)"}`;
    }

    // ── Filesystem ────────────────────────────────────────────────────────────
    case "agent_read_file": {
      const fp = String(args.path ?? "");
      if (!fp) return "Error: path is required.";
      try {
        const content = await agent.readFile(fp);
        return content.slice(0, 15000) + (content.length > 15000 ? "\n…(truncated)" : "");
      } catch (e: any) { return `Read failed: ${e.message}`; }
    }

    case "agent_write_file": {
      const fp = String(args.path ?? "");
      const content = String(args.content ?? "");
      if (!fp) return "Error: path is required.";
      const r = await agent.writeFile(fp, content);
      return r.ok ? `Written: ${fp} (${(content.length/1024).toFixed(1)} KB)` : `Write failed: ${r.error}`;
    }

    case "agent_list_dir": {
      const dir = String(args.path ?? "");
      if (!dir) return "Error: path is required.";
      const r = await agent.listDir(dir);
      if (!r.ok) return `List failed: ${r.error}`;
      return `${r.path}\n${r.entries?.map((e: any) => `${e.type === "dir" ? "📁" : "📄"} ${e.name}${e.type === "file" ? ` (${(e.size/1024).toFixed(0)}K)` : ""}`).join("\n") || "(empty)"}`;
    }

    case "agent_delete_file": {
      const fp = String(args.path ?? "");
      if (!fp) return "Error: path is required.";
      const r = await agent.deleteFile(fp, args.recursive === true);
      return r.ok ? `Deleted: ${fp}` : `Delete failed: ${r.error}`;
    }

    // ── System ────────────────────────────────────────────────────────────────
    case "agent_system_info": {
      const r = await agent.getSystemInfo();
      if (!r.ok) return `System info failed: ${r.error}`;
      const tools = Object.entries(r.tools ?? {})
        .map(([k, v]) => `${v ? "✓" : "✗"} ${k}`).join("  ");
      return `${r.user}@${r.hostname} | ${r.platform} ${r.arch}\nCPU: ${r.cpuCores}× ${r.cpuModel}\nRAM: ${r.memFreeGB}GB free / ${r.memTotalGB}GB (${r.memUsedPct}% used)\nTools: ${tools}`;
    }

    case "agent_processes": {
      return await agent.getProcesses();
    }

    // ── Clipboard ─────────────────────────────────────────────────────────────
    case "agent_clipboard_read": {
      const t = await agent.getClipboard();
      return t || "(clipboard is empty)";
    }

    case "agent_clipboard_write": {
      const text = String(args.text ?? "");
      if (!text) return "Error: text is required.";
      await agent.setClipboard(text);
      return `Clipboard updated (${text.length} chars).`;
    }

    default:
      return `Unknown agent tool: ${name}`;
  }
}
