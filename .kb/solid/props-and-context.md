# Props, hook params, return shapes — Solid

> Layer: **solid** (the port).
> Concept (abstract): no separate concept doc — Solid-specific.
> React reference: n/a (React passes plain values; Solid passes accessors)

## Status

- **Ported:** yes (project-wide convention)
- **Verified:** yes
- **Last reviewed:** 2026-04-16

## Divergences from React

- **All hook parameters are reactive.** React passes plain values; Solid
  passes a single `parameters` (or `context`) object whose properties are
  **reactive accessors** (`MaybeAccessor<T>` / `Accessor<T>`).
- **Hooks return accessors, not destructurable values.** A React hook that
  returns `{ open, setOpen }` becomes a Solid hook that returns
  **either** an accessor (`() => ({ open, setOpen })`) **or** an object
  whose property reads stay reactive. Plain destructuring of a reactive
  object loses reactivity — the call site must keep the accessor or use
  `mergeProps`/`splitProps`/getter-properties to preserve it.
- **`props.children` resolves eagerly via `children()`.** Solid's
  `children()` helper memoizes children resolution. When children render
  conditionally, the **same condition** must wrap the `children()` call —
  otherwise the helper resolves children too eagerly or for the wrong
  branch.

## Solid-specific implementation notes

### Hooks take a single reactive parameter object

Pattern:

```ts
type Parameters = {
  open: MaybeAccessor<boolean>;
  // ...
};

function useThing(parameters: Parameters) {
  const open = () => access(parameters.open);
  // read open() inside effects, JSX, etc.
}
```

`access(...)` from Solid (or a project helper) unwraps both raw values
and accessors, so a hook works whether the caller passes a plain value or
an accessor. This is the Solid analogue of "props are always plain
values" in React.

### Return accessor instead of destructurable object

A React hook returning `{ a, b }` lets the caller do
`const { a, b } = useHook()`. In Solid, that destructure freezes `a` and
`b` to their values at the moment of call.

Two acceptable Solid shapes:

1. **Return a top-level accessor:** `function useHook(): Accessor<{ a, b }>`
   — caller writes `useHook()().a`.
2. **Return an object with getter properties:** the object's properties
   are getters that read signals on each access. Caller writes
   `result.a` and reactivity is preserved.

Either works; choose to match the surrounding code in the file being
ported.

### `children()` + conditional rendering

```tsx
function Component(props: { children: JSX.Element; visible: boolean }) {
  const resolved = children(() => props.visible && props.children);
  return <Show when={props.visible}>{resolved()}</Show>;
}
```

The `props.visible &&` inside `children(() => …)` mirrors the `<Show>`
condition. If you write `children(() => props.children)` without
repeating the condition, the children resolve eagerly even when not
shown — which can fire effects in the children's setup.

## Known issues / TODOs

None.

## Files (target)

- Pattern used across every ported hook. Examples:
  - `packages/solid/src/collapsible/root/useCollapsibleRoot.ts`
  - `packages/solid/src/collapsible/panel/useCollapsiblePanel.ts`
  - `packages/solid/src/popover/root/PopoverRoot.tsx`

## Test commands

```bash
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
```
