# Collapsible animation — Solid

> Layer: **solid** (the port).
> Concept (abstract): [`../concepts/collapsible-animation.md`](../concepts/collapsible-animation.md)
> React reference: [`../react/collapsible-animation.md`](../react/collapsible-animation.md)

## Status

- **Ported:** yes
- **Verified:** needs verification (no regressions reported recently, but the
  full chromium / browsers matrix has not been re-run since the port settled)
- **Last reviewed:** 2026-04-16

## Divergences from React

The Solid port mirrors the React structure closely. Differences:

- **`useState` → `createSignal` / `useControlled`.** `open` uses Solid's
  `useControlled` (returns getter + setter). All other state values are
  signals. Rendering/JSX reads them as `value()`.
- **`useRef<T>` → `useRef<T>` from `solid-helpers`.** API identical
  (`.current` mutable). See [`./refs.md`](./refs.md).
- **`useLayoutEffect` → `createEffect`.** Solid's `createEffect` runs
  synchronously like a layout effect. See
  [`./effects-and-cleanup.md`](./effects-and-cleanup.md).
- **`useTransitionStatus` is a Solid port** under
  `packages/solid/src/utils/useTransitionStatus.ts`. Same `(open,
  enableIdleState, deferEndingState)` signature; same 4-value enum.
- **`flushSync` removed.** Solid is synchronous by default. The close
  cleanup just sets state in order; `batch(() => ...)` is used at the
  trigger handler entry to keep the multi-setter call atomic — Solid does
  not batch outside event handler scope automatically.
- **Cleanup ordering.** Solid runs cleanups child-first on unmount, opposite
  to React's parent-first order. The collapsible orchestration is
  parent-driven, so this rarely matters here, but verify if a regression
  appears in the close-while-unmounting path. See
  [`./effects-and-cleanup.md`](./effects-and-cleanup.md).
- **Trigger handler uses `batch(...)`.** React relies on automatic batching;
  Solid wraps the multi-setter region of `handleTrigger` in `batch(() =>
  { ... })` (visible in `useCollapsibleRoot.ts` line ~66).

The React-specific orchestration sequence (open / close / keyframe /
beforematch / reopen-during-close) all carries over 1:1 — the abstract
sequence in [`../concepts/collapsible-animation.md`](../concepts/collapsible-animation.md)
is the spec for both implementations.

## Solid-specific implementation notes

- The panel ref callback uses Solid's `ref={handlePanelRef}` form. It runs
  when the element attaches and is the right place for one-shot
  `getComputedStyle` detection (refs are assigned after render in Solid; see
  [`./refs.md`](./refs.md)).
- All hook parameters that React passes as plain values are passed as
  reactive accessors (`MaybeAccessor<T>`). Inside the hook, they are read
  via `access(parameters.foo)` to support both raw values and accessors.
  See [`./props-and-context.md`](./props-and-context.md).
- The `hidden` value is a `createMemo` because it's read in JSX and depends
  on multiple signals (`animationType`, `visible`, `open`, `mounted`).

## Known issues / TODOs

None recorded specifically for collapsible. General Solid gotchas that may
surface here are tracked in [`./gotchas.md`](./gotchas.md).

## Files (target)

- `packages/solid/src/collapsible/root/CollapsibleRoot.tsx`
- `packages/solid/src/collapsible/root/useCollapsibleRoot.ts`
- `packages/solid/src/collapsible/root/CollapsibleRootContext.tsx`
- `packages/solid/src/collapsible/root/stateAttributesMapping.ts`
- `packages/solid/src/collapsible/trigger/CollapsibleTrigger.tsx`
- `packages/solid/src/collapsible/trigger/CollapsibleTriggerDataAttributes.ts`
- `packages/solid/src/collapsible/panel/CollapsiblePanel.tsx`
- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts`
- `packages/solid/src/collapsible/panel/CollapsiblePanelDataAttributes.ts`
- `packages/solid/src/collapsible/panel/CollapsiblePanelCssVars.ts`
- `packages/solid/src/utils/useTransitionStatus.ts`
- `packages/solid/src/utils/useAnimationsFinished.ts`
- `packages/solid/src/utils/useOpenChangeComplete.tsx`
- `packages/solid/src/utils/useRenderElement.tsx`

Tests:

- `packages/solid/src/collapsible/root/CollapsibleRoot.test.tsx`
- `packages/solid/src/collapsible/trigger/CollapsibleTrigger.test.tsx`
- `packages/solid/src/collapsible/panel/CollapsiblePanel.test.tsx`

Docs/demos:

- `docs-solid-v2/src/content/solid/components/collapsible.mdx`
- `docs-solid-v2/src/demos/solid/collapsible/hero/{css-modules,tailwind}/`

## Test commands

```bash
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
pnpm test:solid:chromium Collapsible --no-watch --reporter=agent
```

## Debugging checklist

If the behavior looks wrong, inspect in this order:

1. Does the panel exist in the DOM?
2. What is `animationTypeRef.current`?
3. Current values of `open()`, `mounted()`, `visible()`, `transitionStatus()`.
4. Does the panel currently have `data-open`, `data-closed`,
   `data-starting-style`, `data-ending-style`, `hidden`?
5. Are `--collapsible-panel-height` and `--collapsible-panel-width` numbers
   or `auto`?
6. When closing, was the `MutationObserver` installed before
   `data-ending-style` appeared?
7. Does `panel.getAnimations()` return what you expect?
8. Did a reopen abort an older close sequence (`abortControllerRef.current`)?
9. Are you accidentally mixing CSS transitions and CSS keyframes on the
   same panel?
10. Is `hiddenUntilFound` forcing `hidden="until-found"` and changing the
    branch?

**Solid-specific additions** to the React debugging checklist:

- Are signal getters being **called** as `open()`, not read as `open` (which
  is the function reference)?
- Is the `batch(...)` in `handleTrigger` actually wrapping all the setters?
  Setters fired *outside* an event handler without `batch` will run
  intermediate effects.
- If a close cleanup never runs, check whether the parent unmounted before
  the child cleanup ran — Solid's child-first cleanup order can swallow
  effects that depend on a parent ref.
