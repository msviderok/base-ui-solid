---
name: vitest-agent-reporter
description: Appends Vitest's agent reporter to every Vitest CLI invocation so test output is structured for Cursor agents. Use whenever running vitest, pnpm/npm scripts that delegate to vitest, or when the user asks to run unit/browser tests in this repo.
---

# Vitest `--reporter=agent`

## Rule

Always include **`--reporter=agent`** on the **vitest** process. No exceptions for agent-driven runs.

## How to apply

- **Direct:** `vitest …` → `vitest … --reporter=agent`
- **Via package manager:** `pnpm vitest … --reporter=agent` (same for `npx vitest`)
- **Via npm/pnpm script** that wraps vitest: pass args after `--`, e.g. `pnpm test:solid:jsdom -- --reporter=agent`
- **Preserve other flags:** append `--reporter=agent`; do not drop existing options

If a script or command already passes `--reporter=…`, add another `--reporter=agent`—Vitest allows multiple reporters on one run.

## Examples

```bash
vitest run packages/solid/src/foo --no-watch --reporter=agent
pnpm test:jsdom NumberField --no-watch --reporter=agent
pnpm test:solid:chromium SliderRoot --no-watch -- --reporter=agent
```
