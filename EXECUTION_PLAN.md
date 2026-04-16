# EXECUTION PLAN — Fix Setup Before Opus Hand-off

**Run these commands in PowerShell from `C:\Users\ruben\source\repos\iPM_GV\iPM_Frontend_V1\`.**

---

## Step 1 — Verify current state (pre-flight)

```powershell
cd C:\Users\ruben\source\repos\iPM_GV\iPM_Frontend_V1

# Confirm skills are in docs/skills/ (should list 5 files)
ls docs\skills\

# Check size of current CLAUDE.md (if small, it's the stub to replace)
(Get-Item CLAUDE.md).Length

# Check if repo-root/ staging folder still exists
Test-Path repo-root
```

Expected:
- `docs\skills\` has 5 `.md` files
- `CLAUDE.md` length is around 683 (stub) — confirms replacement needed
- `repo-root` returns `True` if it still exists

---

## Step 2 — Replace root CLAUDE.md

The correct CLAUDE.md is 8401 bytes and lives at `repo-root/CLAUDE.md`. Overwrite the root stub with it:

```powershell
# Replace stub with the full version from staging folder
Copy-Item -Path repo-root\CLAUDE.md -Destination CLAUDE.md -Force

# Verify the replacement
(Get-Item CLAUDE.md).Length
```

Expected: length is now ~8401 bytes.

Verify content:

```powershell
Select-String -Path CLAUDE.md -Pattern "SIX NON-NEGOTIABLE"
Select-String -Path CLAUDE.md -Pattern "docs/skills/"
```

Both should return matches. Paths inside reference `docs/skills/` (NOT `docs-skills/`) — this was already correct.

---

## Step 3 — Expand `.gitignore`

Your current `.gitignore` is minimal. Replace it with the provided one:

```powershell
# Backup current if paranoid
Copy-Item .gitignore .gitignore.bak

# Overwrite with the comprehensive version (from the outputs folder)
Copy-Item -Path "path\to\downloaded\.gitignore" -Destination .gitignore -Force

# Verify .env is ignored
Select-String -Path .gitignore -Pattern "^\.env$"
```

Expected: match found on `.env`.

Double-check `.env` is not tracked:

```powershell
git ls-files | Select-String -Pattern "^\.env$"
```

Expected: no output. If `.env` appears, remove from tracking:

```powershell
git rm --cached .env
git commit -m "chore: untrack .env"
```

---

## Step 4 — Delete `repo-root/` staging folder

```powershell
# Safe delete (folder should only contain the CLAUDE.md we just copied)
ls repo-root\
Remove-Item -Recurse -Force repo-root\

# Verify
Test-Path repo-root
```

Expected: `False`.

---

## Step 5 — Create `OPUS_CONTEXT.md` at repo root

Place the downloaded `OPUS_CONTEXT.md` at the repo root:

```powershell
# Assuming you downloaded OPUS_CONTEXT.md to a known location
Copy-Item -Path "path\to\downloaded\OPUS_CONTEXT.md" -Destination OPUS_CONTEXT.md

# Verify
Test-Path OPUS_CONTEXT.md
```

---

## Step 6 — Verify sprint tracker is in initial state

The sprint tracker must show "NOT STARTED" so Opus doesn't inherit stale progress:

```powershell
Select-String -Path docs\skills\ipm-frontend-v1-sprint.md -Pattern "Last updated" -Context 0,1
Select-String -Path docs\skills\ipm-frontend-v1-sprint.md -Pattern "Current phase:" -Context 0,1
Select-String -Path docs\skills\ipm-frontend-v1-sprint.md -Pattern "Phases complete:" -Context 0,1
```

Expected output:
```
Last updated: [NOT STARTED]
Current phase: NONE
Phases complete: 0 / 11
```

If it shows anything else (e.g. "Phase 0 completed" from a previous attempt), reset it manually.

---

## Step 7 — Commit and tag

```powershell
git add CLAUDE.md .gitignore OPUS_CONTEXT.md
git rm -rf --cached repo-root\ 2>$null   # if it was tracked
git add -u                                  # stage deletions
git status                                  # review what's being committed

git commit -m "chore: finalize setup — replace stub CLAUDE.md, expand gitignore, add OPUS_CONTEXT, remove staging folder"

git tag v1-setup-complete
```

Expected commit includes:
- modified: `CLAUDE.md` (stub → full)
- modified: `.gitignore`
- new: `OPUS_CONTEXT.md`
- deleted: `repo-root/CLAUDE.md` (if it was tracked)

---

## Step 8 — Final verification

Run all checks in one block:

```powershell
# Size check — CLAUDE.md should be the full one
Write-Host "CLAUDE.md size:" (Get-Item CLAUDE.md).Length
# Expected: ~8401

# Content check — six rules present
Write-Host ""
Write-Host "Six rules present:" (Select-String -Path CLAUDE.md -Pattern "SIX NON-NEGOTIABLE" -Quiet)
# Expected: True

# Path check — references docs/skills/, not docs-skills/
Write-Host ""
Write-Host "docs/skills/ references:" (Select-String -Path CLAUDE.md -Pattern "docs/skills/" -Quiet)
# Expected: True

# .gitignore check
Write-Host ""
Write-Host ".env ignored:" (Select-String -Path .gitignore -Pattern "^\.env$" -Quiet)
Write-Host "node_modules ignored:" (Select-String -Path .gitignore -Pattern "node_modules" -Quiet)
# Expected: both True

# .env not tracked
Write-Host ""
Write-Host ".env tracked by git:" ((git ls-files | Select-String -Pattern "^\.env$").Count -gt 0)
# Expected: False

# repo-root/ deleted
Write-Host ""
Write-Host "repo-root/ exists:" (Test-Path repo-root)
# Expected: False

# OPUS_CONTEXT present
Write-Host ""
Write-Host "OPUS_CONTEXT.md exists:" (Test-Path OPUS_CONTEXT.md)
# Expected: True

# Sprint tracker in initial state
Write-Host ""
Write-Host "Sprint tracker NOT STARTED:" ((Select-String -Path docs\skills\ipm-frontend-v1-sprint.md -Pattern "NOT STARTED" -Quiet))
# Expected: True

# Five skills present
Write-Host ""
Write-Host "Skill files count:" (Get-ChildItem docs\skills\*.md).Count
# Expected: 5
```

If ALL checks show the expected values, setup is complete.

---

## Step 9 — Open Claude Code and verify auto-load

1. In VS Code, open the project folder `iPM_Frontend_V1`
2. Open Claude Code
3. Ask: **"¿Cuáles son las seis reglas no-negociables?"**

Claude Opus should respond with:
1. No handwritten types
2. No `fetch()` outside `apiClient.ts`
3. No duplicate hooks
4. No refactoring copied components
5. No DTOs in UI/engines
6. No React in engines

If any are missing or different, `CLAUDE.md` didn't auto-load. Check the file is at repo root, not inside a subfolder.

Then ask:

> "Lee OPUS_CONTEXT.md y dime qué es lo primero que hay que hacer."

Opus should confirm Phase 0 is the next action, and list the pre-flight checks.

---

## If something goes wrong

**CLAUDE.md copy failed** — check `repo-root/CLAUDE.md` exists:
```powershell
Test-Path repo-root\CLAUDE.md
(Get-Item repo-root\CLAUDE.md).Length
```

**Git sees `.env` as tracked** — remove from index:
```powershell
git rm --cached .env
git commit -m "chore: untrack .env"
```

**Claude doesn't list six rules** — verify file location:
```powershell
Get-ChildItem CLAUDE.md
# should show file at C:\Users\ruben\source\repos\iPM_GV\iPM_Frontend_V1\CLAUDE.md
# NOT inside docs/ or another subfolder
```

**Sprint tracker shows stale progress** — reset manually by editing `docs/skills/ipm-frontend-v1-sprint.md`, the "PROGRESS TRACKER" section at the bottom. Set:
- `**Last updated:** [NOT STARTED]`
- `**Current phase:** NONE`
- `**Phases complete:** 0 / 11`
- `**Hours consumed:** 0 / 40h 30min`
- All phase checkboxes unchecked
- All gates unchecked
