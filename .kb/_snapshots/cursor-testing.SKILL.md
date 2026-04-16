<!-- KB SNAPSHOT — do not edit by hand. Source: ~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/testing/SKILL.md. Last synced: 2026-04-16. -->

---
description: Hint for testing Base UI SolidJS port
alwaysApply: false
---

---
description: Hint for testing Base UI SolidJS port
alwaysApply: false
---

---
description: Hint for testing Base UI SolidJS port
alwaysApply: false
---

---
name: base-ui-regression-testing
description: Use when checking for regressions in Base UI SolidJS or React implementations
alwaysApply: false
---

When asked to check for regressions:

- For SolidJS implementation, run:
  - `test:solid:agent:jsdom`
  - `test:solid:agent:chromium`
  - `test:solid:agent:firefox`
  - `test:solid:agent:webkit`

- For React implementation, run:
  - `pnpm cross-env vitest --retry 0 --project @base-ui/react ...`

Use these commands to verify behavior and compare SolidJS against React when needed.
