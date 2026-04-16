# Collapsible

## Status

| Aspect                          | Status                                  |
| :------------------------------ | :-------------------------------------- |
| Ported (`packages/solid/`)      | yes                                     |
| Docs ported (`docs-solid-v2/`)  | yes                                     |
| Tests passing (jsdom)           | unknown — re-run before relying on it   |
| Tests passing (chromium)        | unknown — re-run before relying on it   |
| Last reviewed                   | 2026-04-16                              |

## Topics covered

| Topic | Concept | React | Solid |
| :--- | :--- | :--- | :--- |
| collapsible-animation | [../concepts/collapsible-animation.md](../concepts/collapsible-animation.md) | [../react/collapsible-animation.md](../react/collapsible-animation.md) | [../solid/collapsible-animation.md](../solid/collapsible-animation.md) |
| transition-status-machine | [../concepts/transition-status-machine.md](../concepts/transition-status-machine.md) | covered in `react/collapsible-animation.md` | covered in `solid/collapsible-animation.md` |
| state-attributes | [../concepts/state-attributes.md](../concepts/state-attributes.md) | [../react/render-element.md](../react/render-element.md) (stub) | covered in `solid/collapsible-animation.md` |
| refs-and-controllers | n/a | [../react/refs-and-controllers.md](../react/refs-and-controllers.md) | [../solid/refs.md](../solid/refs.md) |

## Source paths

- React (read-only): `packages/react/src/collapsible/`
- Solid (target):    `packages/solid/src/collapsible/`
- Docs (target):     `docs-solid-v2/src/content/solid/components/collapsible.mdx`
- Demos (target):    `docs-solid-v2/src/demos/solid/collapsible/`

## Open issues

None recorded specifically for collapsible. Cross-cutting Solid gotchas
that may surface here are tracked in [`../solid/gotchas.md`](../solid/gotchas.md).

## Quick test

```bash
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
pnpm test:solid:chromium Collapsible --no-watch --reporter=agent
```
