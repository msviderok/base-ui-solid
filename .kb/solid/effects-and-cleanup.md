# Effects and cleanup ordering — Solid

> Layer: **solid** (the port).
> Concept (abstract): no separate concept doc — Solid-specific.
> React reference: [`../react/refs-and-controllers.md`](../react/refs-and-controllers.md) (related — refs survive in both, but lifecycle differs)

## Status

- **Ported:** yes (rules below are project-wide)
- **Verified:** yes (in active use; reordering bugs caught and fixed in
  multiple components — see Known issues)
- **Last reviewed:** 2026-04-16

## Divergences from React

- **`useLayoutEffect` → `createEffect`.** Solid's `createEffect` runs
  synchronously after the render that triggered it, so it serves the same
  role as a React layout effect. There is no separate "render effect" vs
  "layout effect" split.
- **Effect dependencies are auto-tracked.** No dependency array. Read a
  signal inside the effect body and the effect re-runs when the signal
  changes. Only signals **read during the effect** track.
- **Cleanup uses `onCleanup(fn)`.** Called inside `createEffect` to
  register cleanup that runs before the next effect run AND on owner
  disposal.
- **Component bodies run once.** Nothing in a Solid component body
  re-executes. Treat the body like a React `useMemo(() => …, [])` —
  initialization only.

## Solid-specific implementation notes

### Cleanup / unmount order is reversed vs React

> In React, parents unmount **before** children (top-to-bottom).
> In Solid, children unmount **before** parents (bottom-to-top).
> See [facebook/react#16728 (comment)](https://github.com/facebook/react/issues/16728#issuecomment-584208473).

Practical consequence: effects in a child that depend on parent state /
parent refs can no longer reach the parent during cleanup. If the child's
cleanup imperatively touches a parent ref or parent context, that ref may
already be torn down.

When porting React code:

- **Audit any cleanup that crosses component boundaries.** If a child
  cleanup writes to / reads from a parent ref, verify the parent still
  exists at cleanup time, or move the cleanup logic up to the parent.
- **Re-arrange effects and cleanup function order** when the React version
  relied on parent-cleanup-first semantics. This sometimes requires
  refactoring imperative ordering to be **framework-agnostic** (don't
  encode lifecycle assumptions into the orchestration).

### One-shot detection inside ref callbacks

Solid assigns refs **after** render. Code that needs to inspect the DOM
once-per-mount belongs in the ref callback or in a `createEffect` that
reads `el()`:

```tsx
ref={(el) => {
  // runs once when the element attaches.
  detect(el);
}}
```

This is the Solid analogue of React's "ref callback runs at attach". See
[`./refs.md`](./refs.md).

### `flushSync` doesn't exist

Solid runs synchronously by default outside of event handlers. Inside an
event handler, multiple setters batch automatically; outside, they don't.
Wrap multi-setter sequences outside event scope in `batch(() => { ... })`
to avoid intermediate-effect runs. See [`./events.md`](./events.md) for
the click-handler batching pattern used in collapsible.

## Known issues / TODOs

- Cleanup-order mismatches were the root cause of multiple porting bugs.
  Audit logic for ordering assumptions when porting any orchestration-heavy
  hook (collapsible, popover, navigation-menu).

## Files (target)

- This is a pattern, not a single file. Canonical examples:
  - `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts`
  - `packages/solid/src/collapsible/root/useCollapsibleRoot.ts`
  - `packages/solid/src/navigation-menu/root/NavigationMenuRoot.tsx`

## Test commands

```bash
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
pnpm test:solid:chromium NavigationMenu --no-watch --reporter=agent
```
