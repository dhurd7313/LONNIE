// Goal Execution Framework — 9-layer autonomous reasoning engine
import { memory } from "./memory";

export type GoalStatus = "pending" | "active" | "experimenting" | "executing" | "complete" | "aborted";
export type RiskLevel = "low" | "medium" | "high";

export interface GEFGoal {
  id: string;
  raw: string;                    // 1. raw input
  normalized: string;             // 1. measurable objective
  opportunities: Opportunity[];   // 2. scored options
  strategy: Strategy | null;      // 3. selected plan
  experiments: Experiment[];      // 4. hypothesis tests
  status: GoalStatus;
  progress: number;               // 0-100
  createdAt: string;
  updatedAt: string;
  result?: string;
  abortReason?: string;
}

export interface Opportunity {
  id: string;
  description: string;
  value: number;       // 1-10
  probability: number; // 0-1
  timeHours: number;
  risk: number;        // 1-10
  complexity: number;  // 1-10
  score: number;       // (value × probability) / (timeHours + risk + complexity)
}

export interface Strategy {
  primary: string;
  backup: string;
  tools: string[];
  estimatedSteps: number;
}

export interface Experiment {
  id: string;
  hypothesis: string;
  result?: string;
  passed?: boolean;
  abortCondition: string;
  riskLevel: RiskLevel;
  ranAt?: string;
}

export interface OpsecFlag {
  level: "WARN" | "THROTTLE" | "ABORT";
  reason: string;
  tracScore: number;   // traceability
  anomScore: number;   // anomaly
  expScore: number;    // exposure
  tempScore: number;   // temporal
  suggestion: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

class GEFEngine {
  private goals: Map<string, GEFGoal> = new Map();

  async loadFromMemory() {
    const entry = await memory.get("__gef_goals__");
    if (entry?.value) {
      const arr = entry.value as GEFGoal[];
      arr.forEach(g => this.goals.set(g.id, g));
    }
  }

  private async persist() {
    await memory.set("__gef_goals__", Array.from(this.goals.values()));
  }

  // Layer 1 — Goal normalization
  normalize(raw: string): string {
    // Make it measurable: add success criteria if missing
    if (raw.match(/\?$/)) return raw.replace(/\?$/, "").trim();
    if (!raw.match(/\b(get|find|create|build|write|send|open|search|analyze|complete)\b/i)) {
      return `Complete the following: ${raw}`;
    }
    return raw.trim();
  }

  // Layer 2 — Opportunity mapping
  mapOpportunities(goal: string): Opportunity[] {
    // Generate 2-3 approaches based on goal type
    const base: Omit<Opportunity, "id" | "score">[] = [];

    if (goal.match(/search|find|research|look up/i)) {
      base.push(
        { description: "Web search + summarize", value: 7, probability: 0.9, timeHours: 0.1, risk: 2, complexity: 2 },
        { description: "HTTP API call to relevant service", value: 8, probability: 0.7, timeHours: 0.2, risk: 3, complexity: 4 },
      );
    } else if (goal.match(/write|create|build|generate/i)) {
      base.push(
        { description: "Generate directly with LLM", value: 8, probability: 0.95, timeHours: 0.05, risk: 1, complexity: 2 },
        { description: "Iterate with user feedback loop", value: 9, probability: 0.8, timeHours: 0.5, risk: 2, complexity: 5 },
      );
    } else if (goal.match(/remember|store|save/i)) {
      base.push(
        { description: "Store to IndexedDB memory", value: 9, probability: 1.0, timeHours: 0.01, risk: 1, complexity: 1 },
      );
    } else {
      base.push(
        { description: "Direct execution with available tools", value: 7, probability: 0.8, timeHours: 0.1, risk: 2, complexity: 3 },
        { description: "Break into sub-tasks, execute sequentially", value: 8, probability: 0.9, timeHours: 0.3, risk: 3, complexity: 5 },
      );
    }

    return base.map(o => ({
      ...o,
      id: uid(),
      score: parseFloat(((o.value * o.probability) / (o.timeHours + o.risk + o.complexity)).toFixed(3)),
    })).sort((a, b) => b.score - a.score);
  }

  // Layer 3 — Strategy selection
  selectStrategy(opportunities: Opportunity[], goal: string): Strategy {
    const best = opportunities[0];
    const backup = opportunities[1] ?? opportunities[0];
    return {
      primary: best.description,
      backup: backup.description,
      tools: this.inferTools(goal),
      estimatedSteps: Math.ceil(best.complexity / 2),
    };
  }

  private inferTools(goal: string): string[] {
    const tools: string[] = [];
    if (goal.match(/search|news|latest|current/i)) tools.push("web_search");
    if (goal.match(/image|photo|picture|show me/i)) tools.push("fetch_image");
    if (goal.match(/file|read|open|document/i)) tools.push("read_file");
    if (goal.match(/save|write|create.*file/i)) tools.push("write_file");
    if (goal.match(/remember|memory|store/i)) tools.push("memory_store");
    if (goal.match(/email/i)) tools.push("send_email");
    if (goal.match(/calendar|event|schedule/i)) tools.push("create_calendar_event");
    if (goal.match(/code|run|execute|calculate/i)) tools.push("run_js");
    if (goal.match(/time|date|day|when/i)) tools.push("get_time");
    if (tools.length === 0) tools.push("run_js");
    return tools;
  }

  // Layer 5 — OPSEC evaluation
  evaluateOpsec(goal: string, strategy: Strategy): OpsecFlag | null {
    const tracScore = goal.match(/track|monitor|spy|location|password|credential/i) ? 8 : 2;
    const anomScore = goal.match(/delete|destroy|wipe|hack|exploit|inject/i) ? 9 : 1;
    const expScore = goal.match(/public|post|share|publish|broadcast/i) ? 6 : 2;
    const tempScore = goal.match(/always|continuously|every|loop|repeat/i) ? 5 : 1;
    const total = (tracScore + anomScore + expScore + tempScore) / 4;

    if (total >= 7) return {
      level: "ABORT", reason: "High-risk operation detected",
      tracScore, anomScore, expScore, tempScore,
      suggestion: "Break this into smaller, auditable steps and confirm intent",
    };
    if (total >= 4) return {
      level: "WARN", reason: "Elevated risk — operator confirmation recommended",
      tracScore, anomScore, expScore, tempScore,
      suggestion: "Proceed with logging enabled",
    };
    return null;
  }

  // Create + track a goal
  async createGoal(raw: string): Promise<GEFGoal> {
    const normalized = this.normalize(raw);
    const opportunities = this.mapOpportunities(normalized);
    const strategy = this.selectStrategy(opportunities, normalized);
    const goal: GEFGoal = {
      id: uid(),
      raw, normalized, opportunities, strategy,
      experiments: [],
      status: "active",
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.goals.set(goal.id, goal);
    await this.persist();
    return goal;
  }

  async updateGoal(id: string, updates: Partial<GEFGoal>) {
    const g = this.goals.get(id);
    if (!g) return;
    Object.assign(g, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
  }

  async completeGoal(id: string, result: string) {
    await this.updateGoal(id, { status: "complete", progress: 100, result });
  }

  async abortGoal(id: string, reason: string) {
    await this.updateGoal(id, { status: "aborted", abortReason: reason });
  }

  getAll(): GEFGoal[] {
    return Array.from(this.goals.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  getActive(): GEFGoal[] {
    return this.getAll().filter(g => g.status === "active" || g.status === "executing");
  }
}

export const gef = new GEFEngine();
