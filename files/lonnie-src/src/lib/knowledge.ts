// Knowledge Panel — ingest, categorize, score research entries
import { memory } from "./memory";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  sourceUrl?: string;
  category: string;
  tags: string[];
  score: number;      // relevance/quality 0-10
  createdAt: string;
  updatedAt: string;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

class KnowledgeBase {
  private entries: Map<string, KnowledgeEntry> = new Map();
  private readonly MEMORY_KEY = "__knowledge_base__";

  async load() {
    const entry = await memory.get(this.MEMORY_KEY);
    if (entry?.value) {
      const arr = entry.value as KnowledgeEntry[];
      arr.forEach(e => this.entries.set(e.id, e));
    }
  }

  private async persist() {
    await memory.set(this.MEMORY_KEY, Array.from(this.entries.values()));
  }

  async add(data: { title: string; content: string; sourceUrl?: string; category?: string; tags?: string[] }): Promise<KnowledgeEntry> {
    const entry: KnowledgeEntry = {
      id: uid(),
      title: data.title,
      content: data.content,
      sourceUrl: data.sourceUrl,
      category: data.category ?? "General",
      tags: data.tags ?? [],
      score: this.scoreContent(data.content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(entry.id, entry);
    await this.persist();
    return entry;
  }

  private scoreContent(content: string): number {
    // Simple scoring: length, presence of facts, urls, numbers
    let score = 5;
    if (content.length > 500) score += 1;
    if (content.length > 2000) score += 1;
    if (content.match(/\d+/g)?.length ?? 0 > 5) score += 1;
    if (content.match(/http/)) score += 1;
    if (content.match(/\b(study|research|according|data|analysis)\b/i)) score += 1;
    return Math.min(score, 10);
  }

  getAll(): KnowledgeEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.score - a.score);
  }

  getByCategory(cat: string): KnowledgeEntry[] {
    return this.getAll().filter(e => e.category === cat);
  }

  search(query: string): KnowledgeEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  getCategories(): string[] {
    return [...new Set(this.getAll().map(e => e.category))];
  }

  async delete(id: string) {
    this.entries.delete(id);
    await this.persist();
  }

  async update(id: string, updates: Partial<KnowledgeEntry>) {
    const e = this.entries.get(id);
    if (!e) return;
    Object.assign(e, updates, { updatedAt: new Date().toISOString() });
    await this.persist();
  }
}

export const kb = new KnowledgeBase();
