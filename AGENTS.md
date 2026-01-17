# AGENTS.md

Purpose: help Codex resume work without re-discovery.

## Snapshot
- App: React + TypeScript + Vite; main UI/logic in `src/components/ToteOrganizer.tsx`.
- Features present: room management, tote CRUD, image analysis via Anthropic, search, import/export, stats, optional access code + PIN, PWA, deploy help.
- Storage: localStorage via `src/lib/storage.ts` with per-user namespace (username -> namespace), plus `draft:new-tote` for in-progress add flow.
- API: direct browser call to Anthropic; requires `VITE_ANTHROPIC_API_KEY` in `.env`.

## Resume Checklist
1) `npm run dev`
2) Ensure `.env` has `VITE_ANTHROPIC_API_KEY` (and optional `VITE_ACCESS_CODE`).
3) Smoke flow: login -> create room -> new tote -> upload image -> save -> search -> export/import -> lock/unlock.

## Key Files
- `src/components/ToteOrganizer.tsx` (single-file UI + logic)
- `src/lib/storage.ts` (namespaced localStorage wrapper)
- `README.md` (setup + deploy notes)

## Known Risks
- API key exposed in browser; fine for prototype, not for production.
- Main component is large; refactor risk if modifying deeply.
- All data is local to the browser; no sync.

## Next Step Ideas (pick one when resuming)
- Add backend proxy for Anthropic calls to avoid client key exposure.
- Split `ToteOrganizer` into smaller components for maintainability.
- Add tests for storage + item parsing.

## Decision Log
- (add entries here with date + short rationale)
