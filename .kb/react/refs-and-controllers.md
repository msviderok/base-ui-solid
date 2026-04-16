# Refs as long-lived controllers — React

> Layer: **react** (upstream, READ-ONLY mirror).
> Concept (abstract): no separate concept doc — this is React-specific.
> Solid port: [`../solid/effects-and-cleanup.md`](../solid/effects-and-cleanup.md) (related — Solid handles this differently because components run once)

## Files (upstream)

This is a pattern used across many components, not a single file. Canonical
example:

- `packages/react/src/collapsible/root/useCollapsibleRoot.ts`
- `packages/react/src/collapsible/panel/useCollapsiblePanel.ts`

Shared utilities that lean on the same idea:

- `packages/react/src/utils/useAnimationsFinished.ts`
- `packages/react/src/utils/useOpenChangeComplete.tsx`

## How React expresses each concept actor

The "concept" here is *the runtime controller is bigger than any single
render*. React's component function reruns on every state change, but the
animation/orchestration flow must not be rebuilt from zero each rerun.

| Concept actor | React expression |
| :--- | :--- |
| Long-lived imperative state | `useRef` |
| One-shot detection | `useRef` set inside a ref callback |
| Cancel-in-flight token | `useRef<AbortController>` |
| One-shot suppression flag | `useRef<boolean>` |
| Reactive state that must trigger render | `useState` |

## Hooks involved

- **`useRef`** — the entire pattern hangs off this. Not all "controller"
  state needs to trigger renders; refs let you keep that state without
  causing or being cleared by rerenders.
- **`useEffect` / `useLayoutEffect`** — read refs; rarely set them.
- **Ref callbacks (`<el ref={fn}>`)** — the place to detect-once on first
  mount. The callback runs when React attaches the element; it does not
  rerun unless the element identity changes.

## React-specific gotchas

The pattern in one sentence: **refs and effects hold the imperative
controller; rerenders project controller state into DOM attributes and
inline styles**.

What survives rerenders:

- detected animation type
- detected transition dimension
- panel DOM node
- abort controller for in-flight close work
- flags that suppress the initial open animation
- `beforematch` flag

What rerenders are mainly used for:

- recomputing final props
- adding or removing `data-*` attributes
- pushing new CSS variable values
- deciding whether the panel should return `null`

### Common mistakes

- **Capturing a ref's `.current` in a closure during render.** That value is
  stale by the time the closure runs. Read `ref.current` inside the closure
  body, not as a closed-over variable.
- **Using state when a ref would do.** If the value never needs to trigger a
  rerender, use a ref. Detected animation type is the canonical example —
  rendering doesn't depend on it directly; orchestration code reads it
  imperatively.
- **Resetting refs on unmount when you should clear in cleanup.** `useEffect`
  cleanup runs on unmount and on dependency change. If a ref holds a
  `MutationObserver`, disconnect it in cleanup AND null the ref.

## Test entry points

This pattern is exercised by every animation-aware component test. Canonical:

```bash
pnpm test:jsdom Collapsible --no-watch
```
