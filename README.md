# Totes McGoats

Organize storage totes with AI-powered image analysis. This is a React + TypeScript + Vite app that runs fully in the browser and stores data in localStorage.

## Features

- Create totes with room assignment and item lists
- Image upload with Anthropic vision analysis
- Search across items and tags
- Import and export data as JSON
- Optional PIN lock and dark mode
- PWA-ready (installable)

## Local Setup

```bash
npm install
cp .env.example .env
```

Set `VITE_ANTHROPIC_API_KEY` in `.env`. If you want a simple shared gate, also set `VITE_ACCESS_CODE` (optional), then:

```bash
npm run dev
```

## Dev vs Deploy

- Local dev uses `.env` on your machine.
- Deployed builds use Vercel Environment Variables.
- Workflow: make changes locally → `git push` to `main` → Vercel auto-deploys.
- To sanity-check a production build locally: `npm run build`.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Create a new Vercel project from the repo.
3. Set `VITE_ANTHROPIC_API_KEY` as an environment variable in Vercel.
4. (Optional) Set `VITE_ACCESS_CODE` for a shared access gate.
5. Deploy. The default Vite build works out of the box.

## Notes

- The Anthropic API key is used in the browser. Treat this as a prototype and use a restricted key.
- The access code is also client-side and should be treated as a lightweight gate, not strong security.
- iOS: open the site in Safari and use Share → Add to Home Screen to install.
- All data is stored locally in the browser (localStorage) and is not synced.
