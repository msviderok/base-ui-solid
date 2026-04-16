# Refs in Solid — Solid

> Layer: **solid** (the port).
> Concept (abstract): no separate concept doc — Solid-specific.
> React reference: [`../react/refs-and-controllers.md`](../react/refs-and-controllers.md)

## Status

- **Ported:** yes (the patterns below are the project-wide conventions)
- **Verified:** yes (in active use across all ported components)
- **Last reviewed:** 2026-04-16

## Divergences from React

- **`useRef<T>` from `solid-helpers`.** Defined in
  `packages/solid/src/solid-helpers.tsx`. API mirrors React's `useRef`
  (`.current` mutable, no reactivity). Used as the long-lived imperative
  controller — see [`../react/refs-and-controllers.md`](../react/refs-and-controllers.md)
  for the underlying concept (it survives across renders the same way in
  Solid because the component body runs once).
- **DOM refs use Solid's `ref={...}` form**, not `ref.current`. Two shapes:
  ```tsx
  ref={el => (someVariable.someRef = el)}    // setter callback
  ref={someRef}                              // accepts SignalSetter
  ```
  Solid assigns the ref **after** render, not during — see
  [`./effects-and-cleanup.md`](./effects-and-cleanup.md) for ordering.

## Solid-specific implementation notes

### `ref` placement rules

These are project conventions, not framework restrictions:

1. **`ref` cannot be passed within nested params.** Pass it as a top-level
   prop on the component. Don't nest it inside a `props={...}` object or
   `componentProps={...}` bag — Solid won't wire it.
2. **`ref` is always passed as `<Component ref={someRef} />`** in components
   (NOT inside a props object).
3. **In tests using the `render` abstraction**, refs go on a holder object:
   `<Component ref={someVariable.someRef} />`. The holder lives in test
   scope; the test reads `someVariable.someRef` after render.

### Render-prop ref forwarding

When a component takes a `render` prop and the consumer wants their own
element to receive the ref, forward it manually:

```tsx
render={(props) => <div ref={el => props.ref(el)} />}
```

`props.ref` is a setter (Solid passes refs as callable setters through
render-prop boundaries). React equivalents that accept `ref` directly do
not exist in Solid — always invoke the setter.

## Known issues / TODOs

None.

## Files (target)

- `packages/solid/src/solid-helpers.tsx` (`useRef` export)
- Used everywhere a React file uses `useRef`. Examples:
  - `packages/solid/src/collapsible/root/useCollapsibleRoot.ts`
  - `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts`

## Test commands

```bash
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
```
