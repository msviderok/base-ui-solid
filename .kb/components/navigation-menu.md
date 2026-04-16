# Navigation Menu

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
| events (focus guards in microtasks) | n/a | n/a | [../solid/events.md](../solid/events.md) |
| floating-root-context (dynamic replacement) | n/a | n/a | [../porting/floating-root-context.md](../porting/floating-root-context.md) |

## Source paths

- React (read-only): `packages/react/src/navigation-menu/`
- Solid (target):    `packages/solid/src/navigation-menu/`
- Docs (target):     `docs-solid-v2/src/content/solid/components/navigation-menu.mdx`
- Demos (target):    `docs-solid-v2/src/demos/solid/navigation-menu/`

## Open issues

From `SolidStuff.md`:

- **Position doesn't update on scroll.** Anchor repositioning isn't
  firing on scroll events. Inspect the positioner subscription and
  whether the floating root context's update path is wired to scroll
  listeners.
- **Bubble/capture event order required focus guards in
  `queueMicrotask`.** Documented in
  [`../solid/events.md`](../solid/events.md). Not a current bug — a
  workaround that's load-bearing. Don't remove without re-validating
  focus flow.
- **Floating root context uses dynamic replacement.** Unique to
  NavigationMenu — see [`../porting/floating-root-context.md`](../porting/floating-root-context.md).
  Identity changes between active triggers; do NOT switch to the
  stable-identity pattern.

## Quick test

```bash
pnpm test:solid:jsdom NavigationMenu --no-watch --reporter=agent
pnpm test:solid:chromium NavigationMenu --no-watch --reporter=agent
```
