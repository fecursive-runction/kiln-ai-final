
# Kiln AI — Cement Plant Assistant (KilnGPT)

An experimental Next.js + TypeScript application for cement plant monitoring, alerting, and optimization powered by GenKit AI flows and Supabase for data persistence. The project exposes a PlantGPT-style agent that can access real-time metrics, historical data, alerts, and trigger optimization workflows.

## Quick summary

- Framework: Next.js (TypeScript)
- AI: GenKit with Google Gemini (via @genkit-ai/google-genai)
- Database / realtime: Supabase (public + service role keys)
- UI: React + Tailwind + Radix primitives

This repository provides both the web UI (monitoring, history, optimization forms) and AI flows under `src/ai` that interact with plant data tools in `src/ai/tools`.

## Table of contents

- Prerequisites
- Environment variables
- Install & run (development)
- GenKit flows (AI) — local development
- Build & production
- Project layout
- Key concepts & contracts
- Security notes
- Troubleshooting
- Contributing

## Prerequisites

- Node.js (recommended >= 18.x; Next.js 15+ works well on modern Node) installed on your machine
- npm (or yarn/pnpm) — examples below use npm
- An instance of Supabase (if you want to run with real data)
- Google Gemini / GenAI API key (if you want the AI flows to call the model)

## Environment variables

Create a `.env.local` at the project root for local development. At minimum configure the values used by the code:

```powershell
# Supabase (public keys consumed by browser code)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key

# (Optional but recommended) Service role key for server-side privileged operations
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Google/GenAI API key used by GenKit plugin
GEMINI_API_KEY=ya29..your_gemini_api_key..

# Next.js runtime environment variables (if needed)
# For example: NEXT_PUBLIC_APP_ENV=development
```

Security: Never commit secrets. Keep `SUPABASE_SERVICE_ROLE_KEY` only in server/deployment secrets (CI or hosting provider environment settings). Do not expose service keys to the browser.

## Install & run (development)

Install dependencies:

```powershell
npm install
```

Run the Next.js development server (the repo sets port 9002 by default):

```powershell
npm run dev
# Opens on http://localhost:9002 by default
```

Lint and typecheck:

```powershell
npm run lint
npm run typecheck
```

## GenKit flows (AI) — local development

This project includes GenKit-powered flows under `src/ai`. To run the GenKit process that wires AI tools for development, use the provided scripts.

- Start GenKit with the dev script (runs `src/ai/dev.ts`):

```powershell
npm run genkit:dev
```

- Watch mode (restarts on changes):

```powershell
npm run genkit:watch
```

The GenKit process loads the AI flows and connects tools (see `src/ai/genkit.ts` and `src/ai/flows/*`). Ensure `GEMINI_API_KEY` is present in your environment when the flows need to call the Gemini model.

## Build & production

Build for production:

```powershell
npm run build
```

Start the production server (after `build`):

```powershell
npm run start
```

Deployment notes:

- Vercel, Netlify, or any Node host supporting Next.js can be used. Configure environment variables in the host.
- Make sure to set `SUPABASE_SERVICE_ROLE_KEY` only as a server-side secret on your host; do not expose it as a public variable.

## Project layout (high-level)

- `src/app` — Next.js app routes, pages, API routes (for ingestion, etc.)
- `src/components` — UI components organized by domain (dashboard, optimize, history, layout, ui primitives)
- `src/ai` — GenKit configuration and AI flows
	- `dev.ts` — GenKit dev entrypoint
	- `genkit.ts` — GenKit plugin configuration (uses `GEMINI_API_KEY`)
	- `flows` — AI flows e.g., `plant-agent.ts`, `optimize-cement-production.ts`, `generate-alerts.ts`
	- `tools` — tool implementations that the AI flows call (`plant-data-tools.ts`)
- `src/lib` — helpers (e.g., `supabaseClient.ts`, formatters, thresholds)
- `src/context`, `src/hooks` — React context and hooks

Example important files:

- `src/ai/flows/plant-agent.ts` — defines a PlantGPT flow that can access tools: `getLiveMetrics`, `getRecentAlerts`, `getHistoricalData`, and `runOptimization`.
- `src/lib/supabaseClient.ts` — creates client instances and documents the use of `NEXT_PUBLIC_...` keys vs `SUPABASE_SERVICE_ROLE_KEY`.

## Key contracts & developer notes

- AI tools (GenKit) are declared in flows via `ai.defineTool`. Each tool has an input/output Zod schema — use those schemas when calling from the LLM or tests.
- The Plant Agent system prompt (in `plant-agent.ts`) sets the assistant persona and the expectations for data summaries and actions.
- `createSupabaseClient` is for browser usage and requires `NEXT_PUBLIC_*` values. `createSupabaseServerClient` will prefer `SUPABASE_SERVICE_ROLE_KEY` in server environments.

Edge cases to consider when developing:

- Missing env vars: code throws readable errors (see `supabaseClient.ts`).
- Running flows without `GEMINI_API_KEY` will disable real model calls; consider using a mocked or local stub during offline dev.
- Service role misuse: do not return service-role data to client code.

## Troubleshooting

- Error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
	- Ensure `.env.local` has the `NEXT_PUBLIC_*` values and restart the dev server.

- Warning: "SUPABASE_SERVICE_ROLE_KEY not set. Falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY"
	- This is a development-time fallback. For production or privileged operations, set `SUPABASE_SERVICE_ROLE_KEY` in server environment variables.

- GenKit/AI errors about missing `GEMINI_API_KEY`
	- Set `GEMINI_API_KEY` in your environment. If you intend to run without the model, update flows or add a mock.

## Security & data handling

- Keep service keys secret. Use host-provided secret storage (Vercel Environment Variables, GitHub Actions Secrets, etc.).
- Avoid logging secrets to console or in trace logs.

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npm install` and add tests for new behavior if applicable.
3. Keep changes focused and include documentation updates.
4. Open a PR describing the change and any required environment or migrations.

If you add a new AI tool or flow, document the tool schema (Zod types) and provide a minimal unit/integration test that verifies the tool wiring (happy path + at least one edge case).

## Next steps / Suggested improvements

- Add automated tests for AI flows using a mocked GenKit plugin.
- Add end-to-end tests for key user journeys (dashboard, optimization submission).
- Add CI lint/typecheck step that runs `npm run lint` and `npm run typecheck` on PRs.

## Summary

This project combines Next.js UI components with GenKit AI flows to deliver a PlantGPT assistant for cement plant monitoring and optimization. Start by setting your environment variables, running `npm install`, and using `npm run dev` + `npm run genkit:dev` to develop both the web UI and the AI flows locally.

If you'd like, I can also:
- Add a small health-check API route that validates environment variables at runtime.
- Add a template `.env.example` file to the repo.
- Add a minimal test harness for the AI tools using dependency injection / mocks.

---

© Project scaffolded for development. See `package.json` for script details.
