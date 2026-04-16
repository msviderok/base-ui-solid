# Testing quirks — Solid

> Layer: **solid** (the port).
> Concept (abstract): no separate concept doc — Solid-specific.
> React reference: n/a — React tests use `act()` / `flushSync` / `flushMicrotasks`; Solid does not.

## Status

- **Ported:** yes (test infrastructure under `packages/solid/`)
- **Verified:** yes
- **Last reviewed:** 2026-04-16

## Divergences from React

- **No `act()` / no `flushMicrotasks`.** Solid is synchronous by default,
  so React's `act(...)` wrapper and the project's `flushMicrotasks` helper
  are **not needed**. Tests that ported from React should drop these
  wrappers entirely — calling them on Solid output is a no-op at best and
  can mask real timing in tests.
- **`@testing-library/jest-dom` matchers behave differently inside iframes.**
  In particular, `toBeInTheDocument()` does **not** work for Solid versions
  when checking against an iframe; use `toBeTruthy()` (or assert on a more
  specific property of the element) instead. Likely cause: jest-dom's
  React vs Solid bindings differ in how they walk the document tree across
  frame boundaries.

## Solid-specific implementation notes

- Test commands (canonical in `package.json`, mirrored in
  [`../README.md`](../README.md)) — use `--reporter=agent` for
  token-efficient agent runs:

  ```bash
  pnpm test:solid:jsdom <Name> --no-watch --reporter=agent
  pnpm test:solid:chromium <Name> --no-watch --reporter=agent
  ```

- The `render` abstraction owns ref placement — see
  [`./refs.md`](./refs.md) for the test-side ref pattern
  (`<Component ref={someVariable.someRef} />`).

## Known issues / TODOs

None recorded. New testing quirks discovered during porting should be
appended here (or moved to `./gotchas.md` if cross-cutting).

## Files (target)

- `packages/solid/src/utils/testUtils.ts`
- Every `*.test.tsx` under `packages/solid/src/`

## Test commands

```bash
pnpm test:solid:jsdom --no-watch --reporter=agent
```
