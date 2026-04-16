# Tooltip

## Status

| Aspect | Status |
| :--- | :--- |
| Ported (`packages/solid/`) | partial — known issues |
| Docs ported (`docs-solid-v2/`) | unknown |
| Tests passing (jsdom) | unknown |
| Tests passing (chromium) | unknown |
| Last reviewed | 2026-04-16 |

## Topics covered

| Topic | Concept | React | Solid |
| :--- | :--- | :--- | :--- |
| floating-root-context | n/a | n/a | [../porting/floating-root-context.md](../porting/floating-root-context.md) |

## Source paths

- React (read-only): `packages/react/src/tooltip/`
- Solid (target):    `packages/solid/src/tooltip/`
- Docs (target):     `docs-solid-v2/src/content/solid/components/tooltip.mdx`
- Demos (target):    `docs-solid-v2/src/demos/solid/tooltip/`

## Open issues

- **TODO: FIX IN SOLID.** Migrated from `SolidStuff.md` without further
  detail. Inspect the Solid implementation for divergences from React
  behavior and document specifics here when investigating.

## Quick test

```bash
pnpm test:solid:jsdom Tooltip --no-watch --reporter=agent
pnpm test:solid:chromium Tooltip --no-watch --reporter=agent
```
