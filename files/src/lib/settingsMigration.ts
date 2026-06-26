// Runs once on app startup — clears any poisoned model/backend values
// from the old version of the app

const STORAGE_KEY = "lonnie_v2_settings";
const LEGACY_KEY  = "lonnie_settings"; // old key from previous versions

const BROKEN_MODELS = [
  "cogito",
  "wormgpt",
  "blackgrg",
  "retired",
  "deprecated",
  "671b",
  "WORMGPT",
];

function isBrokenModel(id: string): boolean {
  return BROKEN_MODELS.some(b => id.toLowerCase().includes(b.toLowerCase()));
}

export function migrateSettings(): void {
  // Wipe legacy key entirely
  try { localStorage.removeItem(LEGACY_KEY); } catch {}

  // Read current settings
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  let changed = false;

  // Fix broken model
  if (settings.model && isBrokenModel(String(settings.model))) {
    // Pick safe default based on backend
    settings.model = settings.backend === "ollama"
      ? "llama3.2"
      : "meta-llama/llama-3.3-70b-instruct:free";
    changed = true;
  }

  // Fix backend being "ollama" when there's no URL configured properly
  // (If they were using Ollama with a broken model, default to OpenRouter)
  if (settings.backend === "ollama" && isBrokenModel(String(settings.model ?? ""))) {
    settings.backend = "openrouter";
    settings.model = "meta-llama/llama-3.3-70b-instruct:free";
    changed = true;
  }

  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }
}

// Call this to fully reset all settings to safe defaults
export function resetSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}
