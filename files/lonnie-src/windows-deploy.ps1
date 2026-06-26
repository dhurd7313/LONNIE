# LONNIE Windows Deploy Script
# Run this in PowerShell from your mylonnie114 repo folder
# Right-click PowerShell -> "Run as Administrator" if you hit permission errors

# ── Step 1: Navigate to your repo ──────────────────────────────────────────
# Change this path to wherever you cloned mylonnie114
cd "$env:USERPROFILE\Documents\mylonnie114"
# If it's somewhere else, use:
# cd "C:\Users\Harlem_Wayne\path\to\mylonnie114"

# ── Step 2: Delete old src folder ──────────────────────────────────────────
Remove-Item -Recurse -Force src

# ── Step 3: Extract the new src from the zip ───────────────────────────────
# Point this at wherever you downloaded lonnie-src.zip
Expand-Archive -Path "$env:USERPROFILE\Downloads\lonnie-src.zip" -DestinationPath "." -Force

# ── Step 4: Install dependencies ───────────────────────────────────────────
npm install

# ── Step 5: Verify it builds ───────────────────────────────────────────────
npm run build

# ── Step 6: Push to GitHub ─────────────────────────────────────────────────
git add -A
git commit -m "fix: settings modal, OpenRouter backend, LONNIE persona"
git push

Write-Host ""
Write-Host "Done! Netlify will auto-deploy in ~1 minute." -ForegroundColor Green
Write-Host "Then open darknesslonnie.netlify.app -> click gear icon -> pick a free model -> Save" -ForegroundColor Cyan
