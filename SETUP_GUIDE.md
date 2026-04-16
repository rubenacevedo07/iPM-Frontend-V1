# SETUP GUIDE — iPM_Frontend_V1 (Windows + Claude Code)

Steps to prepare the repo before opening the first Claude Code session.

---

## What you have

You received these files to install:

```
repo-root/
  CLAUDE.md                       ← auto-loaded by Claude Code

docs-skills/
  ipm-v4-core-architect.md        ← deep architecture reference
  ipm-engine-runtime.md           ← engine lifecycle & workers
  ipm-data-fusion-enforcer.md     ← pipeline & PR review
  ipm-frontend.md                 ← v2 architectural rules
  ipm-frontend-v1-sprint.md       ← LIVE sprint tracker (update every session)

docs/
  capability-matrix.md            ← which source each file comes from
  engine-r3f-decision.md          ← why Three.js vanilla
  state-model.md                  ← 4-level state model
  graph-engine-research.md        ← sprint 2 archive
  PR_CHECKLIST.md                 ← goes to .github/PULL_REQUEST_TEMPLATE.md

STARTUP_PROMPT.md                 ← what to paste into Claude Code
SETUP_GUIDE.md                    ← this file
```

---

## Installation — step by step

### 1. Create the new repo

```powershell
cd C:\Users\ruben\source\repos\iPM_GV
mkdir iPM_Frontend_V1
cd iPM_Frontend_V1
```

**Do NOT run `npm create vite` yet.** That happens in Phase 0 under Claude Code's guidance. For now, just create the folder and the docs structure.

### 2. Create the docs structure

```powershell
mkdir docs
mkdir docs\skills
mkdir .github
```

### 3. Copy the files to their destinations

Using PowerShell, File Explorer, or VS Code — whichever you prefer. Final placement:

| Source file (from download) | Destination in `iPM_Frontend_V1\` |
|---|---|
| `repo-root/CLAUDE.md` | `CLAUDE.md` (repo root) |
| `docs-skills/ipm-v4-core-architect.md` | `docs\skills\ipm-v4-core-architect.md` |
| `docs-skills/ipm-engine-runtime.md` | `docs\skills\ipm-engine-runtime.md` |
| `docs-skills/ipm-data-fusion-enforcer.md` | `docs\skills\ipm-data-fusion-enforcer.md` |
| `docs-skills/ipm-frontend.md` | `docs\skills\ipm-frontend.md` |
| `docs-skills/ipm-frontend-v1-sprint.md` | `docs\skills\ipm-frontend-v1-sprint.md` |
| `docs/capability-matrix.md` | `docs\capability-matrix.md` |
| `docs/engine-r3f-decision.md` | `docs\engine-r3f-decision.md` |
| `docs/state-model.md` | `docs\state-model.md` |
| `docs/graph-engine-research.md` | `docs\graph-engine-research.md` |
| `docs/PR_CHECKLIST.md` | `.github\PULL_REQUEST_TEMPLATE.md` |

### 4. Create `.gitignore` BEFORE first commit

```powershell
Set-Content -Path .gitignore -Value @"
node_modules
dist
.env
.env.local
.env.*.local
.DS_Store
*.log
coverage
"@
```

Verify:
```powershell
Get-Content .gitignore
```

Must list `.env` explicitly.

### 5. Initialize git and commit the docs

```powershell
git init
git add CLAUDE.md docs/ .github/ .gitignore
git status
```

The output should show:
- `CLAUDE.md`
- `docs/skills/*.md` (5 files)
- `docs/*.md` (4 files)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.gitignore`

**`.env` must NOT appear.** If it does, something went wrong — stop and fix before continuing.

```powershell
git commit -m "chore: initial docs + CLAUDE.md"
```

### 6. Verify the backend is running

Before opening Claude Code:

```powershell
curl -k https://localhost:32771/api/persons/7
```

Should return JSON with Elon Musk's data. If it returns a connection error, the backend isn't running. Start it first.

### 7. Accept the self-signed certificate in your browser

Open a browser (Chrome / Edge / Firefox — whichever you dev in):

1. Navigate to `https://localhost:32771/swagger`
2. Browser warns "Your connection is not private"
3. Click **Advanced** → **Proceed to localhost (unsafe)**
4. Swagger UI loads

**This step is required once per browser.** Without it, the Vite proxy will fail silently with 502s.

### 8. Open VS Code and Claude Code

```powershell
code .
```

Open Claude Code in VS Code. Paste the prompt from `STARTUP_PROMPT.md`:

```
Estamos arrancando iPM_Frontend_V1 desde cero. Lee CLAUDE.md (auto-loaded).
Luego lee docs/skills/ipm-frontend-v1-sprint.md y ejecuta el checklist de Phase 0.

Cuando termine Phase 0, actualiza el progress tracker en
docs/skills/ipm-frontend-v1-sprint.md y haz commit "v1-phase-0".

No empieces Phase 1 hasta que yo confirme que Phase 0 pasó.
```

Claude Code should load `CLAUDE.md` automatically and work from there.

---

## Verifying `CLAUDE.md` was auto-loaded

After Claude's first response, ask:

> ¿Cuáles son las seis reglas no-negociables?

If Claude lists the six rules correctly (no handwritten types, no fetch outside apiClient, no duplicate hooks, no refactor of copied components, no DTOs in UI/engines, no React in engines), the auto-load worked.

If Claude says "I don't know" or makes up rules, `CLAUDE.md` didn't load. Say:

> Lee CLAUDE.md de la raíz del proyecto antes de seguir.

---

## One more thing — rotate the OpenAI API key

Earlier in the planning chat, an OpenAI API key was pasted. That key is considered compromised. Before using it in `.env`:

1. Go to https://platform.openai.com/api-keys
2. Revoke the old one
3. Generate a new one
4. Paste the new one into `.env` locally (Phase 0 will create the file)
5. Never paste it into any chat again

`.env` goes in `.gitignore`. Verify before every commit.

---

## Troubleshooting

**Claude doesn't see `CLAUDE.md`**
- Check file is literally named `CLAUDE.md` (uppercase CLAUDE, `.md` extension)
- Check it's in the repo root, not in `docs/`
- Restart VS Code

**Backend returns 502**
- Did you accept the cert in your browser? (Step 7)
- Is `vite.config.ts` proxy set with `secure: false`?
- Is the backend actually running on port 32771?

**`git add` includes `.env`**
- Stop. Check `.gitignore` contains `.env` on its own line
- If you already committed it, remove it from git history before pushing anywhere

**Claude wants to install `openapi-typescript`**
- Stop it. Rule 1 says no. Point it to `CLAUDE.md` section "The Six Non-Negotiable Rules".
