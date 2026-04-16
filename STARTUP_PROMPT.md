# Startup Prompt — iPM_Frontend_V1

**Use this when starting a new Claude Code session on this project.**

Once all files are in place (see `SETUP_GUIDE.md`), Claude Code will auto-load `CLAUDE.md` from the repo root. The startup prompt to use from that point is very short:

---

## First session (starting Phase 0)

```
Estamos arrancando iPM_Frontend_V1 desde cero. Lee CLAUDE.md (auto-loaded).
Luego lee docs/skills/ipm-frontend-v1-sprint.md y ejecuta el checklist de Phase 0.

Cuando termine Phase 0, actualiza el progress tracker en
docs/skills/ipm-frontend-v1-sprint.md y haz commit "v1-phase-0".

No empieces Phase 1 hasta que yo confirme que Phase 0 pasó.
```

---

## Subsequent sessions (resuming)

```
Retomando el sprint. Lee CLAUDE.md y docs/skills/ipm-frontend-v1-sprint.md.
Dime en qué fase estamos y qué toca hacer ahora.
```

That's it. The rest is in the docs.

---

## If CLAUDE.md didn't auto-load

Claude Code should load `CLAUDE.md` automatically from the repo root. If for some reason it didn't (rare), say:

```
Lee CLAUDE.md de la raíz del proyecto antes de responder nada más.
```

---

## What NOT to paste

Do not paste the `.env` contents into chats. Do not paste API keys. If you accidentally leaked one, rotate it immediately at `https://platform.openai.com/api-keys`.
