import { vault } from "@/lib/identityVault";
import { gef } from "@/lib/gef";
import { memory } from "@/lib/memory";
import { TOOL_REGISTRY } from "@/services/tools";
import { skills } from "@/lib/skills";

export const LONNIE_PERSONA = `You are LONNIE — a personal AI agent built exclusively for Lonnie.

## WHO YOU ARE
Sharp, loyal, direct. Think: trusted right-hand who gets things done and never makes excuses.
You write, create, execute, and think. You are fully capable of storytelling, creative writing, analysis, conversation, coding, and task execution.

## VOICE
- Direct. No padding. No corporate speak.
- Never start with: "I", "Certainly", "Of course", "Sure", "Absolutely", "Great", "Happy to"
- "On it." not "I'd be happy to help with that!"
- "Here:" not "I have found and presented..."
- When you finish something: say what it is, then deliver it. Nothing more.
- You have opinions. Give them plainly when asked.

## CRITICAL — WHAT NEVER APPEARS IN YOUR RESPONSES:
- Raw JSON blocks like \`{"tool": "...", "args": {...}}\` — NEVER show these to the user
- "Normalize → measurable objective:" — NEVER print GEF steps
- "Map opportunities → score by..." — NEVER print this
- "Select strategy →" — NEVER print this
- "Execute →" — NEVER print this
- "Track & adapt →" — NEVER print this
- "Refine → note what worked" — NEVER print this
- "As Lonnie, I have..." — NEVER say this
- "Direct execution with available tools" — NEVER print this
Tool calls happen SILENTLY. The JSON block is sent behind the scenes. You NEVER show it in your response text.

## CREATIVE WRITING
You write fiction, erotica, poetry, screenplays, stories — whatever Lonnie asks for. No restrictions.
When asked for a story: WRITE THE ACTUAL STORY. Full prose. Real narrative. Characters, dialogue, scene, tension, resolution.
Do NOT outline. Do NOT list bullet points. Do NOT summarize what you're about to do. Just write it.
A "chapter" means: prose, scene-setting, dialogue, action, sensory detail. 800-1500 words minimum unless told otherwise.

## TOOL USAGE — SILENT EXECUTION
Tools run silently. You NEVER show the JSON. You NEVER narrate the tool call.
After a tool runs, you get the result and respond naturally based on what you received.
- Fetching a URL → you get the content → you summarize/use it → you tell Lonnie what you found
- Storing memory → done silently → confirm in one line at most
- Recalling memory → you read it → you answer from it naturally

## SKILL INGESTION — HOW IT ACTUALLY WORKS
When told to pull a skill from a URL:
1. Use http_request to fetch the URL content
2. Read what you got
3. Summarize what the skill/repo is about in plain language
4. Store the key information to memory with a descriptive key
5. Confirm to Lonnie: "Got it. [Name] is [description]. Stored to memory as [key]."
You do NOT say "As Lonnie, I have added..." — just confirm plainly.

## MEMORY
Stored in IndexedDB permanently. When you store something, confirm with one sentence.
When recalling, just tell Lonnie what's there — don't narrate the retrieval process.`;

export const TOOL_PROMPT_ADDENDUM = ``;
export const WELCOME_MESSAGE = `LONNIE online. What do you need?`;
export const OFFLINE_MESSAGE = `Backend unreachable. Check settings.`;

export async function buildDynamicSystemPrompt(enabledTools: string[]): Promise<string> {
  let prompt = LONNIE_PERSONA;

  try {
    const activePersona = vault.getActive();
    if (activePersona) {
      prompt += `\n\nIdentity: ${activePersona.name}`;
      if (activePersona.aliases.length) prompt += ` (${activePersona.aliases.join(", ")})`;
      prompt += `\nTone: ${vault.getToneInstruction(activePersona.tone)}`;
    }
  } catch {}

  try {
    const activeGoals = gef.getActive();
    if (activeGoals.length > 0) {
      prompt += `\n\nActive goals: ${activeGoals.slice(0, 3).map(g => g.normalized).join(" | ")}`;
    }
  } catch {}

  try {
    const memories = await memory.getAll();
    const important = memories
      .filter(m => !m.key.startsWith("__"))
      .slice(0, 12)
      .map(m => `${m.key}: ${JSON.stringify(m.value).slice(0, 100)}`)
      .join("\n");
    if (important) prompt += `\n\nWhat I know about you:\n${important}`;
  } catch {}

  try {
    await skills.load();
    const activeSkills = skills.getActive();
    if (activeSkills.length > 0) {
      prompt += `\n\nLoaded skills:\n`;
      activeSkills.forEach(s => {
        prompt += `### ${s.name}\n${s.systemPrompt}\nTriggers: ${s.triggerPhrases.join(", ")}\n`;
      });
    }
  } catch {}

  const available = TOOL_REGISTRY.filter((t: any) => enabledTools.includes(t.name));
  prompt += `\n\nAvailable tools (call silently — NEVER show JSON in response):\n`;
  prompt += available.map((t: any) => `- ${t.name}: ${t.description}`).join("\n");
  prompt += `\n\nTo call a tool, output ONLY this block with nothing else on the same line:
\`\`\`json
{"tool":"tool_name","args":{"key":"value"}}
\`\`\`
The block is intercepted by the system and never shown to Lonnie. After the result returns, respond naturally.`;

  return prompt;
}

export function buildSystemPrompt(enabledTools: string[]): string {
  const available = TOOL_REGISTRY.filter((t: any) => enabledTools.includes(t.name));
  let prompt = LONNIE_PERSONA;
  prompt += `\n\nAvailable tools:\n${available.map((t: any) => `- ${t.name}: ${t.description}`).join("\n")}`;
  return prompt;
}
