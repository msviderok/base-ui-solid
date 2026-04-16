# Solid Collapsible Animation Parity Research

This note compares the React collapsible animation implementation against the
current SolidJS port and focuses on what is still missing for full parity.

## Scope and method

I compared these files directly:

- `packages/react/src/collapsible/root/useCollapsibleRoot.ts`
- `packages/react/src/collapsible/panel/useCollapsiblePanel.ts`
- `packages/react/src/collapsible/panel/CollapsiblePanel.tsx`
- `packages/react/src/utils/useTransitionStatus.ts`
- `packages/react/src/utils/useAnimationsFinished.ts`
- `packages/react/src/utils/useOpenChangeComplete.tsx`

Against:

- `packages/solid/src/collapsible/root/useCollapsibleRoot.ts`
- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts`
- `packages/solid/src/collapsible/panel/CollapsiblePanel.tsx`
- `packages/solid/src/utils/useTransitionStatus.ts`
- `packages/solid/src/utils/useAnimationsFinished.ts`
- `packages/solid/src/utils/useOpenChangeComplete.tsx`

I also ran the current Solid collapsible test suite:

```bash
pnpm test:solid:chromium Collapsible --no-watch -- --reporter=agent
```

Result:

- 3 test files passed
- 55 tests passed

That confirms the basic Solid collapsible behavior works today, but those tests
do not cover the animation-specific timing paths.

## Executive summary

The Solid collapsible port is not missing the big branches of the React logic.
The transition branch, keyframe branch, `keepMounted`, `hiddenUntilFound`, and
`beforematch` code all exist.

What is still missing is the same level of lifecycle certainty that React has
around panel mount and animation setup.

The most important gap is this:

- React wires `handlePanelRef` directly into the element ref path, so animation
  mode detection and initial measurement happen before the open and close layout
  effects run.
- Solid defers that work through `setRef -> onMount(() => handlePanelRef(el))`,
  while the downstream animation effects do not react to `animationTypeRef` or
  `panelRef` changing.

That means the Solid port contains the logic, but it does not guarantee the same
ordering the React implementation depends on.

## Findings

### 1. High-confidence parity gap: panel animation setup no longer has React's ref-before-effect ordering

React reference:

- `packages/react/src/collapsible/panel/useCollapsiblePanel.ts:69-151`
- `packages/react/src/collapsible/panel/useCollapsiblePanel.ts:153-320`

Solid port:

- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts:61-144`
- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts:146-293`
- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts:374-381`

What React does:

- `handlePanelRef` is part of the merged ref path.
- It detects `animationTypeRef.current` and `transitionDimensionRef.current`
  synchronously from the mounted DOM node.
- The transition and keyframe effects then run with that detection already
  available.

What Solid does:

- `setRef` does not call `handlePanelRef(el)` directly.
- Instead it does this:

```ts
setRef: (el) => {
  onMount(() => handlePanelRef(el));
}
```

Why this matters:

- The downstream transition effect is keyed only on
  `[hiddenUntilFound, keepMounted, mounted, open]`.
- The keyframe effect tracks `open()` and other accessors used inside it.
- Neither effect is keyed on `animationTypeRef.current`.
- `panelRef.current` is also a plain ref, not a tracked signal.

So if `handlePanelRef` is what first populates:

- `animationTypeRef.current`
- `transitionDimensionRef.current`
- initial measured dimensions

then the later effects are not guaranteed to rerun just because that ref-based
setup happened.

This is the missing piece for animation parity:

- the logic is present
- but the Solid lifecycle no longer guarantees the same ordering React relies on

The TODO left in the Solid source is a strong signal that this part is still not
fully settled:

- `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts:377-379`

```ts
/**
 * TODO: putting it into onMount seems to properly time the measurement.
 * Otherwise the ref is set slightly too early.
 */
```

That is not a parity-complete port. It is a workaround with uncertain timing.

### 2. Confirmed issue: debug logging was left inside the Solid panel component

File:

- `packages/solid/src/collapsible/panel/CollapsiblePanel.tsx:99-105`

Current code:

```ts
onMount(() => {
  console.log('MOUNT');

  onCleanup(() => {
    console.log('UNMOUNT');
  });
});
```

This is confirmed by the test run output, which printed `MOUNT` and `UNMOUNT`
many times during normal collapsible tests.

This is not an animation-flow gap by itself, but it does show the Solid port is
still carrying debug instrumentation in the animation-sensitive component.

### 3. Confirmed gap in validation: the Solid collapsible suite does not test animation behavior

Current Solid collapsible tests:

- `packages/solid/src/collapsible/root/CollapsibleRoot.test.tsx`
- `packages/solid/src/collapsible/panel/CollapsiblePanel.test.tsx:20-88`

What they cover:

- basic ARIA wiring
- disabled state
- uncontrolled and controlled open/close
- keyboard interaction
- `keepMounted`
- `hiddenUntilFound`

What they do not cover:

- enter transitions via `data-starting-style`
- exit animations via `data-ending-style`
- waiting for animation completion before unmount
- first-open measurement timing
- interruption and reopen behavior while a close is in flight

That missing coverage stands out because other Solid components already have
those tests.

Examples:

- `packages/solid/src/tabs/panel/TabsPanel.test.tsx:19-121`
- `packages/solid/src/checkbox/indicator/CheckboxIndicator.test.tsx:186-291`

Those files explicitly verify:

- enter animation starts from `data-starting-style`
- exit animation applies `data-ending-style` before unmount

The Solid collapsible currently has none of that validation, even though its
animation controller is more complex than either of those components.

### 4. Lower-priority parity issues

These are real differences, but they are not the core animation gap.

- `packages/solid/src/collapsible/panel/CollapsiblePanel.tsx:18`
  still points to the React docs URL in the comment.
- `packages/solid/src/collapsible/trigger/CollapsibleTrigger.tsx`
  also still points to the React docs URL in the comment.

Those do not affect runtime behavior, but they are signs the port is not fully
cleaned up yet.

## What does not appear missing

These parts do appear to exist in the Solid source:

- high-level open and close state machine
- deferred `ending` state through `useTransitionStatus(..., true, true)`
- separate `visible` handling for CSS keyframe animations
- `MutationObserver` waiting for `data-ending-style`
- `beforematch` listener and `hidden="until-found"` handling
- open-complete cleanup via `useOpenChangeComplete`
- aborting in-flight close cleanup on reopen

So the problem is not "Solid forgot to port the branches".
The problem is "the most timing-sensitive branch was ported with weaker
lifecycle guarantees and without animation-specific regression tests".

## Bottom line

The Solid collapsible is closest to parity in structure, but not yet in
animation confidence.

The two concrete things still missing are:

1. A deterministic equivalent to React's `handlePanelRef` timing so animation
   type detection and measurement definitely happen before the transition and
   keyframe effects depend on them.
2. Animation regression tests for Solid collapsible itself, matching the style
   already used in Solid `Tabs.Panel` and `Checkbox.Indicator`.

Without those two pieces, the Solid port can look complete in code review and
still miss first-open or remount-related animation bugs that the current test
suite would never catch.
