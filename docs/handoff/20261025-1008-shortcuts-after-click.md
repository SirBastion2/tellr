# Handoff

### [B] Shortcuts after icon clicks — Agent B1 — 2026-10-25 10:08
- **Status:** done
- **Gate:** `scripts/gate.sh b` → PASS (typecheck, lint, 199 tests, contract OK)

```
── typecheck
── lint
── test
 Test Files  56 passed (56)
      Tests  199 passed (199)
── contract
contract OK: library + 7 fixtures (42 steps) valid and current; oracles intact

GATE PASS (b)
```

- **Changed:** `web/src/ui/DemoShortcuts.tsx`, `web/src/ui/shortcuts.ts`, `web/src/ui/shortcuts.test.ts`, `web/src/ui/ShortcutHelp.tsx`, `web/src/shortcuts.test.tsx`, `web/src/shortcutsAfterClick.test.tsx`, `ARCHITECTURE.md`, `docs/UI_REFERENCE.md`, `docs/A_TO_B.md`, `docs/handoff/20261025-1008-shortcuts-after-click.md`
- **Decisions I made, and the section that justified each:**
  - The demo key handler stayed one listener on `window`, moved to the capture phase (`web/src/ui/DemoShortcuts.tsx`). Bubble only hears a key from a focused button when that event bubbles. After a click, focus stays on the button. If the control stops the key, the shortcut never ran until a click on the page moved focus off it. Capture runs first, so toolbar, scheme, help, and chip buttons no longer swallow `T` / `P` / the other demo keys. Architecture workstation keys; UI reference keyboard section.
  - `isEditableTarget` still ignores an input, textarea, select, and contenteditable. It stops at a `button`, link, summary, or button-type input, including an SVG icon inside the button, so those controls are not treated as typing. Enter and Space are not demo keys and are not cancelled, so a focused button still activates. `web/` does not compute risk, level, reasons, or the next question (architecture §9, §12).
  - Shortcut help is the key list only. Removed the sentence about every screen and Ctrl/Alt/Cmd. The guards stay in the handler. `docs/UI_REFERENCE.md` says the dialog lists the keys only.
- **Questions logged:** none
- **The next agent needs to know:** No contract, engine, library, golden, or weight edits. No new dependency. Enter and Space still belong to the focused button. Do not move the listener back to the bubble phase.
