/**
 * LONNIE Local Agent — runs on your Windows machine
 * Gives the browser app real desktop/system access
 * 
 * Start with: node agent.js
 * Exposes: http://localhost:45678
 */

import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, readdir, stat, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);
const app = express();
const PORT = 45678;

// ── Allow LONNIE web app to connect ──────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://darknesslonnie.netlify.app",
  /^https:\/\/.*\.netlify\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/0\.0\.0\.0(:\d+)?$/,
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = allowedOrigins.some((entry) => {
      if (typeof entry === "string") return entry === origin;
      return entry.test(origin);
    });
    cb(null, allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-lonnie-token", "Authorization"],
}));
app.use(express.json({ limit: "50mb" }));

// ── Auth token (simple) ───────────────────────────────────────────────────────
const TOKEN = process.env.LONNIE_TOKEN || "lonnie-local";
console.log(`\n🔑 Auth token: ${TOKEN}`);
console.log(`   Set this in LONNIE Settings > Agent URL token field\n`);

function auth(req, res, next) {
  const headerToken = req.headers["x-lonnie-token"];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const t = String(headerToken || bearerToken || req.query.token || "");
  if (!t || t !== TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/ping", (req, res) => {
  res.json({
    ok: true,
    version: "1.0.0",
    platform: process.platform,
    hostname: os.hostname(),
    user: os.userInfo().username,
    uptime: Math.floor(process.uptime()),
  });
});

// ── Terminal command execution ─────────────────────────────────────────────────
app.post("/exec", auth, async (req, res) => {
  const { command, cwd, timeout = 30000 } = req.body;
  if (!command) return res.status(400).json({ error: "command required" });
  
  // Safety: log every command
  console.log(`[EXEC] ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || os.homedir(),
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash",
    });
    res.json({ 
      ok: true, 
      stdout: stdout.trim(), 
      stderr: stderr.trim(),
      combined: (stdout + (stderr ? "\n[stderr] " + stderr : "")).trim()
    });
  } catch (e) {
    res.json({ 
      ok: false, 
      error: e.message, 
      stdout: e.stdout?.trim() || "",
      stderr: e.stderr?.trim() || "",
    });
  }
});

// ── Docker operations ──────────────────────────────────────────────────────────
app.get("/docker/containers", auth, async (req, res) => {
  try {
    const { stdout } = await execAsync(
      "docker ps -a --format \"{{json .}}\"",
      { shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash" }
    );
    const containers = stdout.trim().split("\n")
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    res.json({ ok: true, containers });
  } catch (e) {
    res.json({ ok: false, error: e.message, hint: "Is Docker running?" });
  }
});

app.post("/docker/action", auth, async (req, res) => {
  const { action, container } = req.body;
  const allowed = ["start", "stop", "restart", "logs", "inspect", "stats"];
  if (!allowed.includes(action)) return res.status(400).json({ error: "Invalid action" });
  
  const cmd = action === "logs"
    ? `docker logs --tail 50 "${container}"`
    : action === "stats"
    ? `docker stats "${container}" --no-stream --format "{{json .}}"`
    : `docker ${action} "${container}"`;
    
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash"
    });
    res.json({ ok: true, output: (stdout + stderr).trim() });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get("/docker/images", auth, async (req, res) => {
  try {
    const { stdout } = await execAsync(
      `docker images --format "{{json .}}"`,
      { shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash" }
    );
    const images = stdout.trim().split("\n")
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    res.json({ ok: true, images });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Screenshot ─────────────────────────────────────────────────────────────────
app.get("/screenshot", auth, async (req, res) => {
  try {
    // Try different screenshot methods
    let method = "powershell";
    
    if (process.platform === "win32") {
      const tmpPath = path.join(os.tmpdir(), `lonnie-screenshot-${Date.now()}.png`);
      const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}') }`;
      await execAsync(`powershell -Command "${ps}"`);
      const imgData = await readFile(tmpPath);
      const base64 = imgData.toString("base64");
      res.json({ ok: true, base64, mimeType: "image/png", path: tmpPath });
    } else if (process.platform === "darwin") {
      const tmpPath = path.join(os.tmpdir(), `lonnie-ss-${Date.now()}.png`);
      await execAsync(`screencapture -x "${tmpPath}"`);
      const imgData = await readFile(tmpPath);
      res.json({ ok: true, base64: imgData.toString("base64"), mimeType: "image/png" });
    } else {
      // Linux — try scrot or import
      const tmpPath = path.join(os.tmpdir(), `lonnie-ss-${Date.now()}.png`);
      try {
        await execAsync(`scrot "${tmpPath}"`);
      } catch {
        await execAsync(`import -window root "${tmpPath}"`);
      }
      const imgData = await readFile(tmpPath);
      res.json({ ok: true, base64: imgData.toString("base64"), mimeType: "image/png" });
    }
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── File system ────────────────────────────────────────────────────────────────
app.get("/fs/list", auth, async (req, res) => {
  const dirPath = String(req.query.path || os.homedir());
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const items = await Promise.all(entries.map(async e => {
      const fullPath = path.join(dirPath, e.name);
      let size = 0;
      try { const s = await stat(fullPath); size = s.size; } catch {}
      return { name: e.name, type: e.isDirectory() ? "dir" : "file", size, path: fullPath };
    }));
    res.json({ ok: true, path: dirPath, entries: items });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.get("/fs/read", auth, async (req, res) => {
  const filePath = String(req.query.path || "");
  if (!filePath) return res.status(400).json({ error: "path required" });
  try {
    const content = await readFile(filePath, "utf-8");
    res.json({ ok: true, path: filePath, content: content.slice(0, 100000) });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post("/fs/write", auth, async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) return res.status(400).json({ error: "path and content required" });
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    res.json({ ok: true, path: filePath, bytes: content.length });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── System info ────────────────────────────────────────────────────────────────
app.get("/system", auth, async (req, res) => {
  try {
    const cpus = os.cpus();
    const mem = { total: os.totalmem(), free: os.freemem() };
    res.json({
      ok: true,
      platform: process.platform,
      arch: os.arch(),
      hostname: os.hostname(),
      user: os.userInfo().username,
      home: os.homedir(),
      cpuModel: cpus[0]?.model,
      cpuCores: cpus.length,
      memTotalGB: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      memFreeGB: (mem.free / 1024 / 1024 / 1024).toFixed(1),
      memUsedPct: Math.round((1 - mem.free / mem.total) * 100),
      uptime: Math.floor(os.uptime()),
      nodeVersion: process.version,
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Process list ───────────────────────────────────────────────────────────────
app.get("/processes", auth, async (req, res) => {
  try {
    const cmd = process.platform === "win32"
      ? `Get-Process | Select-Object Name, Id, CPU, WorkingSet | ConvertTo-Json`
      : `ps aux --sort=-%cpu | head -20`;
    const { stdout } = await execAsync(cmd, {
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash"
    });
    res.json({ ok: true, output: stdout.trim() });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Clipboard ──────────────────────────────────────────────────────────────────
app.get("/clipboard", auth, async (req, res) => {
  try {
    let text = "";
    if (process.platform === "win32") {
      const { stdout } = await execAsync("Get-Clipboard", { shell: "powershell.exe" });
      text = stdout.trim();
    } else if (process.platform === "darwin") {
      const { stdout } = await execAsync("pbpaste");
      text = stdout;
    } else {
      const { stdout } = await execAsync("xclip -selection clipboard -o");
      text = stdout;
    }
    res.json({ ok: true, text });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post("/clipboard", auth, async (req, res) => {
  const { text } = req.body;
  try {
    if (process.platform === "win32") {
      await execAsync(`Set-Clipboard -Value "${text.replace(/"/g, '`"')}"`, { shell: "powershell.exe" });
    } else if (process.platform === "darwin") {
      const { stdin } = spawn("pbcopy");
      stdin.write(text); stdin.end();
    } else {
      const p = spawn("xclip", ["-selection", "clipboard"]);
      p.stdin.write(text); p.stdin.end();
    }
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Open URL / file ────────────────────────────────────────────────────────────
app.post("/open", auth, async (req, res) => {
  const { url } = req.body;
  try {
    const cmd = process.platform === "win32" ? `Start-Process "${url}"`
      : process.platform === "darwin" ? `open "${url}"`
      : `xdg-open "${url}"`;
    await execAsync(cmd, { shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash" });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── Interactive terminal (WebSocket) ───────────────────────────────────────────
// (PTY-based terminal for true interactive use)

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/terminal" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");
  if (token !== TOKEN) { ws.close(1008, "Unauthorized"); return; }

  console.log("[TERMINAL] WebSocket connected");
  
  const shell = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/bash");
  const proc = spawn(shell, [], {
    cwd: os.homedir(),
    env: { ...process.env, TERM: "xterm-256color" },
  });

  proc.stdout.on("data", d => ws.readyState === 1 && ws.send(JSON.stringify({ type: "output", data: d.toString() })));
  proc.stderr.on("data", d => ws.readyState === 1 && ws.send(JSON.stringify({ type: "output", data: d.toString() })));
  proc.on("exit", (code) => ws.readyState === 1 && ws.send(JSON.stringify({ type: "exit", code })));

  ws.on("message", msg => {
    try {
      const { type, data } = JSON.parse(msg.toString());
      if (type === "input") proc.stdin.write(data);
      if (type === "resize") { /* PTY resize handled if node-pty installed */ }
    } catch {}
  });

  ws.on("close", () => { proc.kill(); console.log("[TERMINAL] Disconnected"); });
});

// ── Start ──────────────────────────────────────────────────────────────────────
server.listen(PORT, "127.0.0.1", () => {
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║  LONNIE Local Agent v1.0.0             ║`);
  console.log(`║  http://localhost:${PORT}               ║`);
  console.log(`╚════════════════════════════════════════╝`);
  console.log(`\nCapabilities:`);
  console.log(`  ✓ Terminal command execution (PowerShell)`);
  console.log(`  ✓ Full screenshot (entire desktop)`);
  console.log(`  ✓ Docker container management`);
  console.log(`  ✓ File system read/write`);
  console.log(`  ✓ System information`);
  console.log(`  ✓ Process list`);
  console.log(`  ✓ Clipboard read/write`);
  console.log(`  ✓ Interactive WebSocket terminal`);
  console.log(`\nWaiting for LONNIE to connect...`);
});
