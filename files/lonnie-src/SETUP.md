# LONNIE — Ollama AI Agent Setup

## What changed
- **`src/integrations/ollama/client.ts`** — brand new robust Ollama API client with streaming, model listing, CORS-safe ping, and pull support
- **`src/services/tools.ts`** — 20 real browser-native capabilities (file I/O, clipboard, notifications, web search, memory, calendar, email, geolocation, battery, JS eval, screenshot)
- **`src/hooks/useOllama.ts`** — main chat hook with streaming, tool call detection/execution, auto-reconnect, and persistent settings
- **`src/components/`** — ChatMessage, ChatInput, ConnectionBar, ToolsPanel rebuilt from scratch
- **`src/pages/Index.tsx`** — full chat UI with sidebar

## How to deploy (replace your repo's src/)

```bash
# 1. Replace your entire src/ folder with this one
cp -r src/ /path/to/mylonnie114/src/

# 2. Install deps (already in your package.json)
npm install

# 3. Start Ollama WITH CORS enabled (critical!)
OLLAMA_ORIGINS=* ollama serve

# 4. Pull a model if you haven't
ollama pull llama3.2

# 5. Run the app
npm run dev
```

## Fixing Ollama CORS (most common issue)

Ollama blocks cross-origin requests by default. You must start it with:

```bash
# macOS / Linux
OLLAMA_ORIGINS=* ollama serve

# Windows PowerShell
$env:OLLAMA_ORIGINS="*"; ollama serve

# Or set it permanently in your shell profile:
echo 'export OLLAMA_ORIGINS=*' >> ~/.zshrc
```

## Env file (`.env`)
```
VITE_OLLAMA_API_URL=http://localhost:11434
VITE_OLLAMA_DEFAULT_MODEL=llama3.2
```

## Tool call format (how LONNIE uses tools)
The system prompt teaches the model to output:
```json
{
  "tool": "web_search",
  "args": { "query": "latest AI news" }
}
```
...inside a fenced code block. The app detects it, executes it in the browser, feeds the result back to the model, and streams the final reply.
