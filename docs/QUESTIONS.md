# Spec questions

Agents append; drivers answer. An open question blocks only the work that depends on it.

### Q-001 · Stop precedence when a recommended and a hard stop coincide
- **Raised by:** kit build · **Sections:** architecture §8.4, §11.2
- **Detail:** In T1's last step (six-question bank), the proceed stop and "no eligible candidate"
  both hold. §8.4 lists both rows but no precedence; §11.2 says `question` is null only on a hard
  stop.
- **Status:** answered by CHANGE-000.

### Q-002 · No settings endpoint
- **Raised by:** kit build · **Sections:** architecture §7.4, §11.1, §12
- **Detail:** §7.4 makes the recommender "swappable at runtime from Settings" and §12 lists a
  Settings screen, but §11.1 has no endpoint for it. B-06 cannot be built as specified.
- **Status:** open → CHANGE-001, decide in P0.

### Q-003 · No error response shape
- **Raised by:** kit build · **Sections:** architecture §4 (command handler), §11.1
- **Detail:** The command handler rejects invalid commands, but the architecture never says what
  B receives when it does, so B has nothing to render.
- **Status:** open → CHANGE-002, decide in P0.

---
