// LONNIE Local Agent client
// Connects to the lonnie-agent server running on the user's machine
// Gives real desktop access: terminal, Docker, screenshots, filesystem

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

export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  State: string;
  Ports: string;
  CreatedAt: string;
}

export interface FileEntry {
  name: string;
  type: "file" | "dir";
  size: number;
  path: string;
}

const STORAGE_KEY = "lonnie_agent_config";

interface AgentConfig {
  url: string;
  token: string;
}

function loadConfig(): AgentConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const url = saved.url || "http://localhost:45678";
    const token = saved.token || (url.includes("localhost") || url.includes("127.0.0.1") ? "lonnie-local" : "");
    return { url, token };
  } catch {
    return { url: "http://localhost:45678", token: "lonnie-local" };
  }
}

function saveConfig(c: AgentConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

class LocalAgentClient {
  private _url: string = "http://localhost:45678";
  private _token: string = "";
  private _connected: boolean = false;

  constructor() {
    const c = loadConfig();
    this._url = c.url || "http://localhost:45678";
    this._token = c.token || (this._url.includes("localhost") || this._url.includes("127.0.0.1") ? "lonnie-local" : "");
  }

  get url() { return this._url; }
  get token() { return this._token; }
  get connected() { return this._connected; }

  configure(url: string, token: string) {
    this._url = url.replace(/\/$/, "");
    const normalizedToken = token.trim() || (this._url.includes("localhost") || this._url.includes("127.0.0.1") ? "lonnie-local" : "");
    this._token = normalizedToken;
    saveConfig({ url: this._url, token: this._token });
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "x-lonnie-token": this._token,
      ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
    };
  }

  async ping(): Promise<AgentStatus> {
    const t0 = performance.now();
    try {
      const res = await fetch(`${this._url}/ping`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        this._connected = false;
        return { connected: false, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      this._connected = true;
      return {
        connected: true,
        latencyMs: Math.round(performance.now() - t0),
        platform: data.platform,
        hostname: data.hostname,
        user: data.user,
        version: data.version,
      };
    } catch (e: any) {
      this._connected = false;
      return { connected: false, error: e.message };
    }
  }

  async exec(command: string, cwd?: string, timeout = 30000): Promise<ExecResult> {
    const res = await fetch(`${this._url}/exec`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ command, cwd, timeout }),
      signal: AbortSignal.timeout(timeout + 2000),
    });
    if (!res.ok) throw new Error(`Agent error: ${res.status}`);
    return res.json();
  }

  async screenshot(): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const res = await fetch(`${this._url}/screenshot`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!data.ok) return null;
      return { base64: data.base64, mimeType: data.mimeType };
    } catch {
      return null;
    }
  }

  async getDockerContainers(): Promise<DockerContainer[]> {
    const res = await fetch(`${this._url}/docker/containers`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Docker unavailable");
    return data.containers;
  }

  async getDockerImages() {
    const res = await fetch(`${this._url}/docker/images`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Docker unavailable");
    return data.images;
  }

  async dockerAction(action: string, container: string): Promise<string> {
    const res = await fetch(`${this._url}/docker/action`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ action, container }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data.output;
  }

  async listDir(dirPath: string): Promise<FileEntry[]> {
    const res = await fetch(`${this._url}/fs/list?path=${encodeURIComponent(dirPath)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data.entries;
  }

  async readFile(filePath: string): Promise<string> {
    const res = await fetch(`${this._url}/fs/read?path=${encodeURIComponent(filePath)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data.content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const res = await fetch(`${this._url}/fs/write`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ path: filePath, content }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
  }

  async getSystemInfo() {
    const res = await fetch(`${this._url}/system`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data;
  }

  async getProcesses(): Promise<string> {
    const res = await fetch(`${this._url}/processes`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data.output;
  }

  async getClipboard(): Promise<string> {
    const res = await fetch(`${this._url}/clipboard`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    return data.text;
  }

  async setClipboard(text: string): Promise<void> {
    const res = await fetch(`${this._url}/clipboard`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
  }

  async openUrl(url: string): Promise<void> {
    await fetch(`${this._url}/open`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(5000),
    });
  }

  // WebSocket terminal
  openTerminal(): WebSocket | null {
    try {
      const ws = new WebSocket(`ws://localhost:45678/terminal?token=${this._token}`);
      return ws;
    } catch {
      return null;
    }
  }
}

export const agent = new LocalAgentClient();
