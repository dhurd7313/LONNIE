// Identity Vault — isolated persona containers with independent memory partitions
import { memory } from "./memory";

export interface Persona {
  id: string;
  name: string;
  email?: string;
  aliases: string[];
  tone: "formal" | "casual" | "aggressive" | "friendly" | "neutral";
  systemPromptOverride?: string;
  memoryPartition: string; // prefix for memory keys in this persona
  active: boolean;
  createdAt: string;
}

class IdentityVault {
  private personas: Map<string, Persona> = new Map();
  private readonly MEMORY_KEY = "__identity_vault__";
  private _activeId: string | null = null;

  async load() {
    const entry = await memory.get(this.MEMORY_KEY);
    if (entry?.value) {
      const arr = entry.value as Persona[];
      arr.forEach(p => {
        this.personas.set(p.id, p);
        if (p.active) this._activeId = p.id;
      });
    }
    // Create default persona if none exist
    if (this.personas.size === 0) {
      await this.create({ name: "Lonnie", tone: "casual", aliases: ["boss", "operator"] });
    }
  }

  private async persist() {
    await memory.set(this.MEMORY_KEY, Array.from(this.personas.values()));
  }

  async create(data: Partial<Persona>): Promise<Persona> {
    const id = Math.random().toString(36).slice(2, 9);
    const p: Persona = {
      id,
      name: data.name ?? "Unnamed",
      email: data.email,
      aliases: data.aliases ?? [],
      tone: data.tone ?? "neutral",
      systemPromptOverride: data.systemPromptOverride,
      memoryPartition: `persona_${id}`,
      active: this.personas.size === 0, // first persona is active
      createdAt: new Date().toISOString(),
    };
    this.personas.set(id, p);
    if (p.active) this._activeId = id;
    await this.persist();
    return p;
  }

  async switchTo(id: string) {
    // Deactivate all, activate target
    for (const p of this.personas.values()) p.active = false;
    const target = this.personas.get(id);
    if (!target) throw new Error(`Persona ${id} not found`);
    target.active = true;
    this._activeId = id;
    await this.persist();
  }

  getActive(): Persona | null {
    if (!this._activeId) return null;
    return this.personas.get(this._activeId) ?? null;
  }

  getAll(): Persona[] {
    return Array.from(this.personas.values());
  }

  async delete(id: string) {
    if (this._activeId === id) throw new Error("Cannot delete active persona");
    this.personas.delete(id);
    await this.persist();
  }

  getToneInstruction(tone: Persona["tone"]): string {
    const tones: Record<Persona["tone"], string> = {
      formal: "Respond formally and professionally. Full sentences, proper grammar.",
      casual: "Respond casually and directly like a trusted friend.",
      aggressive: "Be blunt, direct, zero padding. Get to the point instantly.",
      friendly: "Warm, encouraging tone. Still direct but approachable.",
      neutral: "Balanced, informative, neither warm nor cold.",
    };
    return tones[tone];
  }
}

export const vault = new IdentityVault();
