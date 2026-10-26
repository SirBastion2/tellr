### Playback speed arrows — Cursor — 2026-10-26 18:46
- **Status:** done
- **Gate:** targeted only, per the task. `npx vitest run src/ui/shortcuts.test.ts src/homeRedesign.test.tsx -t "changes speed from the playback arrows|maps the working keys|ignores typing|still maps keys"` → 4 passed, 9 skipped. `scripts/gate.sh` was not run.
- **Changed:** `web/src/workstation/Toolbar.tsx`, `web/src/ui/icons.tsx`, `web/src/ui/shortcuts.ts`, `web/src/ui/shortcuts.test.ts`, `web/src/ui/DemoShortcuts.tsx`, `web/src/ui/ShortcutHelp.tsx`, `web/src/App.tsx`, `web/src/index.css`, `web/src/homeRedesign.test.tsx`, `README.md`, `docs/UI_REFERENCE.md`, `ARCHITECTURE.md`, `docs/handoff/20261025-1610-home-step-hover.md`
- **Decisions I made, and the section that justified each:**
  - Right arrow and the Right key step 1× → 2× → 4× and the control disables at 4×. Left arrow and the Left key step back and stay disabled at 1×. The speed label stays in the row between the arrows at every speed, including 1×. `ARCHITECTURE.md` playback bar (`web/src/workstation/Toolbar.tsx`) and shortcut map (`web/src/ui/shortcuts.ts`).
  - Typing and Ctrl/Cmd/Alt still skip those keys, same as the other demo keys.
- **Questions logged:** none
- **The next agent needs to know:** PR targets `sandbox/integration`. No backend edits. The older footer note in `docs/handoff/20261025-1610-home-step-hover.md` now records that its first mapping (left speeds up, right slows down, label only above 1×) was replaced.
