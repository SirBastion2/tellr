### Vercel static deploy — Agent B — 2026-10-25 10:45
- **Status:** done
- **Gate:** `scripts/gate.sh a` → PASS
  ```
  216 passed, 1 warning in 24.86s
  Contracts: 1 kept, 0 broken.
  contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact
  GATE PASS (a)
  ```
  Also `npx vitest --run src/connection.test.ts src/devApi.test.ts` (13 passed) and `npm run build` (tsc + vite build, output `web/dist`).
- **Changed:** `web/mock/sampleFetch.ts`, `web/src/connection.ts`, `web/src/connection.test.ts`, `web/package.json`, `web/vercel.json`, `ARCHITECTURE.md`, `docs/UI_REFERENCE.md`, `docs/A_TO_B.md`
- **Decisions I made, and the section that justified each:**
  - Production builds install the browser shim after `GET /health` on the live origin fails (`import.meta.env.PROD`), except the deployed-host case below. Dev still uses the Vite plugin. Vitest still returns before the probe. Architecture map, `web/` dev modes.
  - The shim calls `mockRequest` for `/library`, `/health`, and `/sessions` only. It does not score. Architecture §9 and the web guardrail: no risk, level, reasons, or next question in `web/`.
  - Sample mode still uses `connectionLabel('sample')` → `Using sample data`. A healthy live origin stays `live`.
  - A production build with `VITE_API_URL` unset does not probe `http://127.0.0.1:8000/health` when the page host is not localhost, 127.0.0.1, or ::1. It installs the sample shim and returns sample mode, so a deployed HTTPS site does not ask Chrome for local-network access or hit mixed content. A set `VITE_API_URL`, or a local page host, still probes and installs the shim only after that probe fails.
  - `build` is `tsc --noEmit && vite build`. `web/vercel.json` rewrites non-asset paths to `/index.html` (Vite SPA on Vercel). Existing files, including `/assets/*`, are served as files.
- **Questions logged:** none
- **The next agent needs to know:** Vercel project settings are root directory `web`, framework Vite, build command `npm run build`, output directory `dist`. Do not set `VITE_API_URL` on that project unless a real API should win the health probe. The shim is sample data, not a live engine. `reference_impl.py`, golden files, weights, and `contract/` were not edited.
