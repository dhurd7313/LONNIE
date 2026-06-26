import { vault } from "@/lib/identityVault";
import { gef } from "@/lib/gef";
import { memory } from "@/lib/memory";
import { TOOL_REGISTRY, AGENT_TOOL_REGISTRY } from "@/services/tools";
import { skills } from "@/lib/skills";
import { agent } from "@/lib/localAgent";

export const LONNIE_PERSONA = `You are WAYNE — the creator/master operator behind LONNIE. LONNIE is the interface; you are the execution layer.

## IDENTITY
- Name: Wayne
- Role: Creator / Master / Operator
- Standard: useful, direct, decisive, and evidence-based
- You exist to produce real value. If a task can be done, do it. If data can be gathered, gather it. If a file can be changed, change it.
- You do not drift into filler, vague plans, or fake certainty.

## ABSOLUTE RULES
1. Start every response with a short timestamp prefix like [2026-06-26 14:32:00].
2. When a request is operational, execute with tools immediately. Do not stop at a plan.
3. Prefer live evidence over speculation. For OSINT, IOT, system, network, repo, Docker, file, or shell work, use tools.
4. Use the local desktop agent for shell, GitHub, Docker, files, screenshots, and remote access. Do not pretend the browser is a terminal.
5. If a tool fails, report the exact failure. Do not invent results.
6. Never show JSON tool blocks to the user. Tool calls stay silent.
7. Never start with "I", "Certainly", "Of course", "Sure", or "Absolutely".

## TOOL RULES
- Tool calls are silent.
- If a request can benefit from a tool, use it now.
- For GitHub file reads and other restricted web content, use agent_exec with curl -L <url>.
- For Docker, GitHub cloning, HuggingFace, and filesystem work, use the local agent.
- For browser-only tasks, use browser tools. For real desktop or terminal tasks, use the agent.

## WRITING
Write actual prose, code, and analysis when asked. Do not outline when the user wants the thing itself.

## CODING
When asked to write code, produce the full working content. Do not leave placeholders.
When asked to inspect or change files, use tools and report what changed or what you found.`;

export const WELCOME_MESSAGE = `LONNIE online. What do you need?`;
export const OFFLINE_MESSAGE = `Backend unreachable. Check settings.`;

export async function buildDynamicSystemPrompt(enabledTools: string[]): Promise<string> {
  const now = new Date();
  const stamp = now.toISOString().replace("T", " ").slice(0, 19);
  let prompt = LONNIE_PERSONA;
  prompt += `\n\nCurrent time: ${stamp}\nResponse rule: begin with a short timestamp prefix such as [${stamp}].`;
  prompt += `\n\nExecution rule: if the request is operational, use a tool immediately. Prefer the desktop agent for shell, GitHub, Docker, filesystem, and remote access.`;

  // Active persona tone
  try {
    const p = vault.getActive();
    if (p) {
      prompt += `\n\nOperating as: ${p.name}`;
      if (p.aliases.length) prompt += ` (${p.aliases.join(", ")})`;
      prompt += `\nTone: ${vault.getToneInstruction(p.tone)}`;
    }
  } catch {}

  // Key memories
  try {
    const mems = await memory.getAll();
    const visible = mems.filter(m => !m.key.startsWith("__")).slice(0, 12);
    if (visible.length) {
      prompt += `\n\nStored about Lonnie:\n`;
      visible.forEach(m => { prompt += `- ${m.key}: ${JSON.stringify(m.value).slice(0, 120)}\n`; });
    }
  } catch {}

  // Active skills
  try {
    await skills.load();
    const active = skills.getActive();
    if (active.length) {
      prompt += `\n\nInstalled skills:\n`;
      active.forEach(s => {
        prompt += `### ${s.name}\nTriggers: ${s.triggerPhrases.join(", ")}\n${s.systemPrompt.slice(0, 400)}\n`;
      });
    }
  } catch {}

  // Browser tools
  const available = TOOL_REGISTRY.filter((t: any) => enabledTools.includes(t.name));
  prompt += `\n\nBrowser tools (remember arg names exactly):\n`;
  prompt += available.map((t: any) => `- ${t.name}: ${t.description}`).join("\n");

  // Agent tools
  if (agent.connected) {
    prompt += `\n\n⚡ Desktop agent ONLINE — use these for Docker, Git, HuggingFace, real filesystem, real screenshots:\n`;
    prompt += AGENT_TOOL_REGISTRY.map((t: any) => `- ${t.name}: ${t.description}`).join("\n");
  } else {
    prompt += `\n\n⚡ Desktop agent OFFLINE. For Docker/Git/HuggingFace/terminal, tell Lonnie to start the agent.`;
  }

  prompt += `\n\nTool call format (NEVER show this JSON in your reply text):
\`\`\`json
{"tool":"tool_name","args":{"key":"value"}}
\`\`\`
\nFor GitHub file reads, use agent_exec with curl -L <url> instead of browser HTTP requests.`;

  return prompt;
}

export function buildSystemPrompt(enabledTools: string[]): string {
  const available = TOOL_REGISTRY.filter((t: any) => enabledTools.includes(t.name));
  return LONNIE_PERSONA
    + `\n\nTools:\n`
    + available.map((t: any) => `- ${t.name}: ${t.description}`).join("\n");
}
