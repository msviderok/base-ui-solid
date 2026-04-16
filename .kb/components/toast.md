# Toast

## Status

| Aspect | Status |
| :--- | :--- |
| Ported (`packages/solid/`) | partial — animation / dismiss bugs |
| Docs ported (`docs-solid-v2/`) | demo present, behavior buggy |
| Tests passing (jsdom) | unknown |
| Tests passing (chromium) | unknown |
| Last reviewed | 2026-04-16 |

## Topics covered

No dedicated Solid topic file yet — issues below are component-specific.

## Source paths

- React (read-only): `packages/react/src/toast/`
- Solid (target):    `packages/solid/src/toast/`
- Docs (target):     `docs-solid-v2/src/content/solid/components/toast.mdx`
- Demos (target):    `docs-solid-v2/src/demos/solid/toast/`

## Open issues

From the Toast demo (migrated from `SolidStuff.md`):

- **Animation breaks when many toasts are added.** Likely an
  effect-ordering or measurement issue when multiple toasts mount in a
  single tick. See [`../solid/effects-and-cleanup.md`](../solid/effects-and-cleanup.md).
- **"Undo" toast disappears when hovered.** Hover should pause dismissal,
  not trigger it.
- **Toasts don't get dismissed properly.** Dismissal flow does not run to
  completion in some paths.

When investigating, inspect:

- `packages/solid/src/toast/createToastManager.ts` — manager state.
- `packages/solid/src/toast/useToastManager.ts` — consumer hook.
- `packages/solid/src/toast/root/` and `packages/solid/src/toast/viewport/`
  — mount/unmount + animation orchestration.

## Quick test

```bash
pnpm test:solid:jsdom Toast --no-watch --reporter=agent
pnpm test:solid:chromium Toast --no-watch --reporter=agent
```
