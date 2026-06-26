// LONNIE Local Agent client v2
// Full desktop access: terminal, Git, HuggingFace, Docker, filesystem

export interface AgentStatus {
  connected: boolean;
  latencyMs?: number;
  platform?: string;
  hostname?: string;
  user?: string;
  version?: string;
  error?: string;
}

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  combined: string;
  error?: string;
}

export interface ImageResult {
  type: "image";
  url: string;
  query: string;
  source: string;
}

const STORAGE_KEY = "lonnie_agent_config";

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const url = saved.url || "http://localhost:45678";
    const token = saved.token || (url.includes("localhost") || url.includes("127.0.0.1") ? "lonnie-local" : "");
    return { url, token };
  }
  catch { return { url: "http://localhost:45678", token: "lonnie-local" }; }
}
function saveConfig(c: { url: string; token: string }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

class LocalAgentClient {
  private _url = "http://localhost:45678";
  private _token = "";
  private _connected = false;

  constructor() {
    const c = loadConfig();
    this._url   = c.url   || "http://localhost:45678";
    this._token = c.token || "";
  }

  get url()       { return this._url; }
  get token()     { return this._token; }
  get connected() { return this._connected; }

  configure(url: string, token: string) {
    this._url   = url.replace(/\/$/, "");
    const normalizedToken = token.trim() || (this._url.includes("localhost") || this._url.includes("127.0.0.1") ? "lonnie-local" : "");
    this._token = normalizedToken;
    saveConfig({ url: this._url, token: this._token });
  }

  private h() {
    return {
      "Content-Type": "application/json",
      "x-lonnie-token": this._token,
      ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
    };
  }

  private async req(method: string, path: string, body?: unknown, timeout = 30000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${this._url}${path}`, {
        method,
        headers: this.h(),
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e: any) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ── Connection ──────────────────────────────────────────────────────────────
  async ping(): Promise<AgentStatus> {
    const t0 = performance.now();
    try {
      const d = await this.req("GET", "/ping", undefined, 4000);
      this._connected = true;
      return { connected: true, latencyMs: Math.round(performance.now() - t0), platform: d.platform, hostname: d.hostname, user: d.user, version: d.version };
    } catch (e: any) {
      this._connected = false;
      return { connected: false, error: e.message };
    }
  }

  // ── Terminal ────────────────────────────────────────────────────────────────
  async exec(command: string, cwd?: string, timeout = 120000): Promise<ExecResult> {
    return this.req("POST", "/exec", { command, cwd, timeout }, timeout + 5000);
  }

  async execBatch(commands: string[], cwd?: string): Promise<{ ok: boolean; results: (ExecResult & { command: string })[] }> {
    return this.req("POST", "/exec/batch", { commands, cwd }, 300000);
  }

  // ── Git ─────────────────────────────────────────────────────────────────────
  async gitClone(url: string, dest?: string, branch?: string, depth = 1) {
    return this.req("POST", "/git/clone", { url, dest, branch, depth }, 600000);
  }

  async gitStatus(dir: string) {
    return this.req("GET", `/git/status?path=${encodeURIComponent(dir)}`, undefined, 10000);
  }

  async gitPull(dir: string) {
    return this.req("POST", "/git/pull", { path: dir }, 120000);
  }

  // ── HuggingFace ─────────────────────────────────────────────────────────────
  async hfModelInfo(modelId: string) {
    return this.req("GET", `/hf/model-info?model=${encodeURIComponent(modelId)}`, undefined, 15000);
  }

  async hfSearch(query: string, limit = 8, filter?: string) {
    const params = `q=${encodeURIComponent(query)}&limit=${limit}${filter ? `&filter=${filter}` : ""}`;
    return this.req("GET", `/hf/search?${params}`, undefined, 15000);
  }

  async hfDownload(model: string, filename?: string, dest?: string, token?: string) {
    return this.req("POST", "/hf/download", { model, filename, dest, token }, 3600000);
  }

  // ── Docker ──────────────────────────────────────────────────────────────────
  async dockerPs() {
    return this.req("GET", "/docker/containers", undefined, 10000);
  }

  async dockerImages() {
    return this.req("GET", "/docker/images", undefined, 10000);
  }

  async dockerAction(action: string, container: string, options?: string) {
    return this.req("POST", "/docker/action", { action, container, options }, 60000);
  }

  async dockerRun(image: string, opts: { name?: string; ports?: string[]; volumes?: string[]; env?: string[]; command?: string; detach?: boolean; options?: string }) {
    return this.req("POST", "/docker/run", { image, ...opts }, 300000);
  }

  async dockerBuild(buildPath: string, tag: string, dockerfile = "Dockerfile", buildArgs: string[] = []) {
    return this.req("POST", "/docker/build", { path: buildPath, tag, dockerfile, args: buildArgs }, 1800000);
  }

  async dockerCompose(composePath: string, action = "up", options = "") {
    return this.req("POST", "/docker/compose", { path: composePath, action, options }, 600000);
  }

  async dockerPull(image: string) {
    return this.req("POST", "/docker/pull", { image }, 600000);
  }

  // ── Workspace ────────────────────────────────────────────────────────────────
  async getWorkspace() {
    return this.req("GET", "/workspace", undefined, 10000);
  }

  // ── File system ─────────────────────────────────────────────────────────────
  async listDir(dirPath: string) {
    return this.req("GET", `/fs/list?path=${encodeURIComponent(dirPath)}`, undefined, 10000);
  }

  async readFile(filePath: string): Promise<string> {
    const d = await this.req("GET", `/fs/read?path=${encodeURIComponent(filePath)}`, undefined, 15000);
    if (!d.ok) throw new Error(d.error);
    return d.content;
  }

  async writeFile(filePath: string, content: string) {
    return this.req("POST", "/fs/write", { path: filePath, content }, 30000);
  }

  async deleteFile(filePath: string, recursive = false) {
    return this.req("POST", "/fs/delete", { path: filePath, recursive }, 15000);
  }

  // ── System ──────────────────────────────────────────────────────────────────
  async getSystemInfo() {
    return this.req("GET", "/system", undefined, 15000);
  }

  async getProcesses(): Promise<string> {
    const d = await this.req("GET", "/processes", undefined, 10000);
    return d.output || d.error;
  }

  // ── Screenshot ──────────────────────────────────────────────────────────────
  async screenshot(): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const d = await this.req("GET", "/screenshot", undefined, 15000);
      if (!d.ok) return null;
      return { base64: d.base64, mimeType: d.mimeType };
    } catch { return null; }
  }

  // ── Clipboard ───────────────────────────────────────────────────────────────
  async getClipboard(): Promise<string> {
    const d = await this.req("GET", "/clipboard", undefined, 5000);
    return d.text || "";
  }

  async setClipboard(text: string) {
    return this.req("POST", "/clipboard", { text }, 5000);
  }

  async openUrl(url: string) {
    return this.req("POST", "/open", { url }, 5000);
  }

  // ── WebSocket terminal ──────────────────────────────────────────────────────
  openTerminal(): WebSocket | null {
    try {
      return new WebSocket(`ws://localhost:45678/terminal?token=${this._token}`);
    } catch { return null; }
  }
}

export const agent = new LocalAgentClient();
