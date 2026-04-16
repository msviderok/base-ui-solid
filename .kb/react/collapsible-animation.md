# Collapsible animation — React

> Layer: **react** (upstream, READ-ONLY mirror).
> Concept (abstract): [`../concepts/collapsible-animation.md`](../concepts/collapsible-animation.md)
> Solid port: [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md)

## Files (upstream)

- `packages/react/src/collapsible/root/CollapsibleRoot.tsx`
- `packages/react/src/collapsible/root/useCollapsibleRoot.ts`
- `packages/react/src/collapsible/trigger/CollapsibleTrigger.tsx`
- `packages/react/src/collapsible/panel/CollapsiblePanel.tsx`
- `packages/react/src/collapsible/panel/useCollapsiblePanel.ts`
- `packages/react/src/utils/useTransitionStatus.ts`
- `packages/react/src/utils/useAnimationsFinished.ts`
- `packages/react/src/utils/useOpenChangeComplete.tsx`
- `packages/react/src/utils/useRenderElement.tsx`
- `packages/react/src/utils/getStateAttributesProps.ts`
- `packages/react/src/utils/stateAttributesMapping.ts`
- `packages/react/src/utils/collapsibleOpenStateMapping.ts`

## How React expresses each concept actor

| Concept actor | React expression |
| :--- | :--- |
| `open` | `useState` in `useCollapsibleRoot`; controlled via `useControlled`. |
| `mounted` / `transitionStatus` | Returned from `useTransitionStatus(open, true, true)`. |
| `visible` | Local `useState` in `useCollapsibleRoot` (keyframe mode only). |
| `height` / `width` | `useState<{ height, width }>` in `useCollapsibleRoot`; written as CSS variables on the panel. |
| `animationType` | `animationTypeRef` (a `useRef`) in `useCollapsibleRoot`. Set once in the panel ref callback. |
| `transitionDimension` | `transitionDimensionRef` (a `useRef`) in `useCollapsibleRoot`. Set once. |
| `panel` (DOM) | `panelRef` (a `useRef`). |
| `abortController` | `abortControllerRef` (a `useRef`). |
| `beforeMatch` flag | `isBeforeMatchRef` (a `useRef`) in `useCollapsiblePanel`. |
| `cancelInitialOpenAnimation` | `shouldCancelInitialOpenAnimationRef` and `shouldCancelInitialOpenTransitionRef` (refs) in `useCollapsiblePanel`. |

The pattern of "imperative controller in refs that survive rerenders" is
documented separately in
[`./refs-and-controllers.md`](./refs-and-controllers.md).

## Hooks involved

- **`useCollapsibleRoot`** — owns `open`, dimensions, and the long-lived refs;
  defines `handleTrigger`. The user click eventually reaches it.
- **`useTransitionStatus(open, true, true)`** — returns `{ mounted,
  setMounted, transitionStatus }`. Configured with `enableIdleState = true`
  and `deferEndingState = true`. See
  [`../concepts/transition-status-machine.md`](../concepts/transition-status-machine.md)
  for the abstract behavior.
- **`useCollapsiblePanel`** — owns the DOM orchestration: panel ref callback
  detects `animationType`, layout effects measure dimensions and install the
  close watcher.
- **`useAnimationsFinished`** — returns `runOnceAnimationsFinish(callback,
  signal, waitForAttribute?)`. Internally uses `panel.getAnimations()`.
- **`useOpenChangeComplete`** — gated on `open && transitionStatus ===
  'idle'`. Resets dimensions back to `auto` when the open animation finishes.
- **`useRenderElement` + `getStateAttributesProps` +
  `stateAttributesMapping` + `collapsibleOpenStateMapping`** — convert
  `{ open, transitionStatus, disabled }` into `data-*` attributes. See
  [`./render-element.md`](./render-element.md).
- **`useButton`** — wraps the trigger button click chain (mainly for
  disabled-state behavior).

## Trigger flow (handler order)

The merged click handler chain on `<Collapsible.Trigger>`:

1. User `onClick` runs first. It can stop the internal handler with
   `event.preventBaseUIHandler()`.
2. Internal `handleTrigger()` from `useCollapsibleRoot`:
   1. Computes `nextOpen = !open`.
   2. Builds `eventDetails` with reason `triggerPress`.
   3. Calls `onOpenChange(nextOpen, eventDetails)`.
   4. Bails if `eventDetails.isCanceled`.
   5. If keyframe mode left an inline `animation-name` on the panel,
      removes it.
   6. If opening with `keepMounted = false` and `hiddenUntilFound = false`,
      eagerly mounts:
      - transitions / no animation: `setMounted(true)`
      - keyframes: `setVisible(true)` and `setMounted(true)`
   7. `setOpen(nextOpen)`.
   8. If closing with `animationType === 'none'`, immediately
      `setMounted(false)`.

So there are two abort points: stop the internal handler entirely, OR let it
run but cancel the state change inside `onOpenChange` via
`eventDetails.cancel()`.

## Open flow (CSS transition)

Mapping the abstract sequence in
[`../concepts/collapsible-animation.md`](../concepts/collapsible-animation.md)
to React mechanics:

1. `handleTrigger` sets `mounted` then `open`.
2. React rerenders. `useTransitionStatus` sees `open && !mounted` during
   render and moves to `mounted = true`, `transitionStatus = 'starting'`.
3. `CollapsiblePanel` renders. The panel ref callback runs (first mount):
   - `animationTypeRef.current = 'css-transition'`.
   - Measures `scrollHeight` / `scrollWidth`.
   - If the panel was initially open, temporarily forces
     `transition-duration: 0s` to suppress the first-mount transition.
4. Panel layout effect (transition mode) with `open = true`:
   - Temporarily neutralizes some flex alignment properties (avoids measuring
     a compressed layout).
   - Writes measured dimensions into React state.
   - On the very first open from a closed-and-unmounted state, manually adds
     `data-starting-style` to compensate for a one-frame timing issue.
5. `useTransitionStatus` schedules one `requestAnimationFrame` to flip
   `transitionStatus` from `starting` to `idle`.
6. Render. `data-starting-style` is removed. CSS transitions from height = 0
   to `var(--collapsible-panel-height)`.
7. `useOpenChangeComplete` (gated on `open && transitionStatus === 'idle'`)
   waits for `panel.getAnimations()` to finish, then resets dimensions to
   `{ height: undefined, width: undefined }` so CSS variables revert to
   `auto`.

## Close flow (CSS transition)

1. `handleTrigger` sets `open = false`. `mounted` stays `true`.
2. Because `deferEndingState = true`, `transitionStatus` does **not** become
   `ending` immediately.
3. The panel close layout effect runs:
   - Measures current `scrollHeight` / `scrollWidth`; stores them.
   - Creates an `AbortController`, stored in `abortControllerRef`.
   - Installs a `MutationObserver` watching for `data-ending-style` to
     appear on the panel.
4. On the next animation frame, `useTransitionStatus` sets
   `transitionStatus = 'ending'`.
5. Render. `useRenderElement` applies `data-ending-style`.
6. The `MutationObserver` fires. Now the panel calls
   `runOnceAnimationsFinish(...)` (`useAnimationsFinished`), which awaits
   `panel.getAnimations()`.
7. When animations settle, cleanup runs synchronously through `flushSync`:
   - `setDimensions({ height: 0, width: 0 })`
   - removes inline `content-visibility`
   - `setMounted(false)`
   - clears the abort controller if still owned by this close
8. Render. `hidden` becomes `true`. If `keepMounted = false` and
   `hiddenUntilFound = false`, `CollapsiblePanel` returns `null` and the
   panel unmounts.
9. `useTransitionStatus` sees `!open && !mounted && transitionStatus ===
   'ending'` and clears the status.

## CSS keyframe mode specifics

- The keyframe layout effect temporarily sets `panel.style.animationName =
  'none'` to safely measure dimensions, then removes the inline override so
  the attribute-driven keyframe animation runs.
- For close: `runOnceAnimationsFinish` settles → `setMounted(false)`,
  `setVisible(false)`. Only after `visible = false` does `hidden` apply,
  which keeps the exit animation visible until completion.

## `hiddenUntilFound` and `beforematch`

- React only knows `hidden` as a boolean. A layout effect forcibly sets
  `hidden = "until-found"` on the DOM node when needed.
- For transitions, the same effect adds `data-starting-style` so the closed
  visual persists across the `hidden` shape change.
- `beforematch` listener sets `isBeforeMatchRef.current = true`, then
  `setOpen(true)` and calls `onOpenChange(true, reason = none)`. The
  reopen-from-`until-found` path forces `transition-duration: 0s` so the
  reveal doesn't produce a weird transition.

## React-specific gotchas

- **Refs hold the long-lived imperative controller.** Rerenders don't rebuild
  the animation flow because `animationTypeRef`, `transitionDimensionRef`,
  `panelRef`, `abortControllerRef`, the initial-open suppression refs, and
  `isBeforeMatchRef` survive. See
  [`./refs-and-controllers.md`](./refs-and-controllers.md) for the canonical
  statement.
- **`flushSync` is required** at the close-cleanup point so dimensions, mount
  flag, and abort clear in one render pass before any subsequent open intent
  is processed.
- **`useOpenChangeComplete` waits for `data-starting-style` to disappear**
  before checking `getAnimations()` for the open transition — prevents
  checking too early.
- **Strict Mode double-invocation** would double-run mount logic. The
  panel ref callback handles repeat invocations by reading current refs
  rather than capturing setup-time values.

## Test entry points

```bash
pnpm test:jsdom Collapsible --no-watch
pnpm test:chromium Collapsible --no-watch
```

Test files:

- `packages/react/src/collapsible/root/CollapsibleRoot.test.tsx`
- `packages/react/src/collapsible/trigger/CollapsibleTrigger.test.tsx`
- `packages/react/src/collapsible/panel/CollapsiblePanel.test.tsx`
