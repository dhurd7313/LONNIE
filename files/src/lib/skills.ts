// Skills system — LONNIE can learn new capabilities from skill definitions
// Compatible with LobeHub skill format + custom LONNIE skill format
import { memory } from "./memory";

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  source?: string;           // URL where skill was found
  systemPrompt: string;      // injected when skill is active
  triggerPhrases: string[];  // phrases that activate this skill
  tools?: string[];          // tools this skill needs
  examples?: string[];       // example prompts
  schema?: Record<string, unknown>; // LobeHub schema if imported
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface SkillCallResult {
  skill: Skill;
  injectedPrompt: string;
}

const MEMORY_KEY = "__lonnie_skills__";

// Built-in watch.skill
export const WATCH_SKILL: Skill = {
  id: "watch-video",
  name: "Video Analyst",
  description: "Watch a video file or URL, analyze each segment, describe content, detect scenes, transcribe speech, and summarize the full video.",
  version: "1.0.0",
  author: "LONNIE",
  source: "built-in",
  systemPrompt: `You are analyzing a video. The user has provided video frames or a video file.

For each segment you receive:
1. Describe what is visually happening (people, objects, actions, environment)
2. Note any text visible on screen
3. Identify scene changes or cuts
4. Note emotional tone or context
5. Flag anything notable (faces, logos, products, locations)

After all segments:
- Provide a full summary of the video
- List key moments with timestamps if available
- Note the overall theme/purpose of the video
- Identify any people, places, or brands if recognizable

Be specific. Describe what you actually see, not what you expect to see.`,
  triggerPhrases: ["watch this", "analyze video", "what's in this video", "watch video", "video analysis", "describe this video", "watch.skill"],
  tools: ["run_js", "http_request"],
  examples: [
    "Watch this video and tell me what happens",
    "Analyze each segment of this clip",
    "What's happening in this video?",
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  active: true,
};

// Built-in research.skill
export const RESEARCH_SKILL: Skill = {
  id: "deep-research",
  name: "Deep Research",
  description: "Multi-source research: search multiple engines, cross-reference results, extract key facts, identify contradictions, produce a structured report.",
  version: "1.0.0",
  author: "LONNIE",
  source: "built-in",
  systemPrompt: `You are conducting deep research. For any research request:
1. Break the topic into 3-5 key sub-questions
2. Use web_search for each sub-question (different search engines for diversity)
3. Cross-reference information across sources
4. Identify consensus vs contested claims
5. Produce a structured report with: Summary, Key Findings, Sources, Confidence Level, Gaps

Always cite what tool/search produced each finding.
Flag when information may be outdated or unverified.`,
  triggerPhrases: ["research", "deep research", "investigate", "find everything about", "research.skill"],
  tools: ["web_search", "http_request", "memory_store"],
  examples: ["Research the best Italian restaurants in NYC", "Investigate this company for me"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  active: true,
};

// Built-in code.skill
export const CODE_SKILL: Skill = {
  id: "code-executor",
  name: "Code Executor",
  description: "Write, execute, debug, and iterate on code. Supports JavaScript (live execution), Python (written to file), and any other language.",
  version: "1.0.0",
  author: "LONNIE",
  source: "built-in",
  systemPrompt: `You are in code execution mode.
- JavaScript: ALWAYS run with run_js tool — show actual output, not expected output
- Python/other: Write complete, runnable code. Save to file with write_file if asked.
- On error: read the error, explain what went wrong in one sentence, fix it, run again
- Never say "this would output" — actually run it and show what it DOES output
- For multi-step problems: write the full solution, run it, report results`,
  triggerPhrases: ["write code", "run code", "execute", "debug this", "code.skill", "write a script", "write a function"],
  tools: ["run_js", "write_file", "read_file"],
  examples: ["Write and run a script that calculates fibonacci numbers", "Debug this code for me"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  active: true,
};

class SkillsManager {
  private skills: Map<string, Skill> = new Map();
  private loaded = false;

  async load() {
    if (this.loaded) return;
    this.loaded = true;

    // Load built-ins
    [WATCH_SKILL, RESEARCH_SKILL, CODE_SKILL].forEach(s => this.skills.set(s.id, s));

    // Load user-added skills from IndexedDB
    try {
      const entry = await memory.get(MEMORY_KEY);
      if (entry?.value) {
        const arr = entry.value as Skill[];
        arr.forEach(s => this.skills.set(s.id, s));
      }
    } catch {}
  }

  private async persist() {
    // Only save user-added skills (not built-ins)
    const userSkills = Array.from(this.skills.values())
      .filter(s => s.source !== "built-in");
    await memory.set(MEMORY_KEY, userSkills);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getActive(): Skill[] {
    return this.getAll().filter(s => s.active);
  }

  get(id: string): Skill | null {
    return this.skills.get(id) ?? null;
  }

  // Detect which skill (if any) is triggered by this message
  detect(message: string): Skill | null {
    const lower = message.toLowerCase();
    for (const skill of this.getActive()) {
      if (skill.triggerPhrases.some(p => lower.includes(p.toLowerCase()))) {
        return skill;
      }
    }
    return null;
  }

  // Add a new skill from text description (operator pastes skill definition)
  async ingestFromText(text: string): Promise<Skill> {
    // Try to parse as JSON (LobeHub format or LONNIE format)
    let parsed: Partial<Skill> = {};

    try {
      const json = JSON.parse(text);
      // LobeHub format: { meta: { title, description }, config: { systemRole } }
      if (json.config?.systemRole || json.meta?.title) {
        parsed = {
          name: json.meta?.title ?? json.name ?? "Imported Skill",
          description: json.meta?.description ?? json.description ?? "",
          systemPrompt: json.config?.systemRole ?? json.systemPrompt ?? text,
          triggerPhrases: json.triggerPhrases ?? [json.meta?.title?.toLowerCase() ?? "use this skill"],
          author: json.meta?.author ?? "imported",
          schema: json,
        };
      } else {
        // Direct LONNIE skill format
        parsed = json;
      }
    } catch {
      // Plain text — treat as system prompt definition
      // Extract name from first line if it starts with #
      const lines = text.trim().split("\n");
      const nameLine = lines.find(l => l.startsWith("#"));
      parsed = {
        name: nameLine?.replace(/^#+\s*/, "") ?? "Custom Skill",
        description: lines.slice(0, 3).join(" ").replace(/^#+\s*/gm, "").slice(0, 200),
        systemPrompt: text,
        triggerPhrases: [],
      };
    }

    const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const skill: Skill = {
      id,
      name: parsed.name ?? "Unnamed Skill",
      description: parsed.description ?? "",
      version: parsed.version ?? "1.0.0",
      author: parsed.author ?? "operator",
      source: parsed.source ?? "manual",
      systemPrompt: parsed.systemPrompt ?? text,
      triggerPhrases: parsed.triggerPhrases ?? [],
      tools: parsed.tools,
      examples: parsed.examples,
      schema: parsed.schema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };

    this.skills.set(id, skill);
    await this.persist();
    return skill;
  }

  // Ingest from a URL (fetch the skill definition)
  async ingestFromUrl(url: string): Promise<Skill> {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Failed to fetch skill: HTTP ${res.status}`);
    const text = await res.text();
    const skill = await this.ingestFromText(text);
    skill.source = url;
    await this.persist();
    return skill;
  }

  async toggle(id: string, active: boolean) {
    const s = this.skills.get(id);
    if (!s) return;
    s.active = active;
    s.updatedAt = new Date().toISOString();
    if (s.source !== "built-in") await this.persist();
  }

  async delete(id: string) {
    const s = this.skills.get(id);
    if (!s || s.source === "built-in") throw new Error("Cannot delete built-in skills");
    this.skills.delete(id);
    await this.persist();
  }

  async updateTriggers(id: string, phrases: string[]) {
    const s = this.skills.get(id);
    if (!s) return;
    s.triggerPhrases = phrases;
    s.updatedAt = new Date().toISOString();
    await this.persist();
  }

  // Build the skill injection for a detected skill
  buildInjection(skill: Skill): string {
    return `\n\n## ACTIVE SKILL: ${skill.name}\n${skill.systemPrompt}`;
  }
}

export const skills = new SkillsManager();
