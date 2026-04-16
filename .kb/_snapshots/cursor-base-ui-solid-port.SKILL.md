<!-- KB SNAPSHOT — do not edit by hand. Source: ~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md. Last synced: 2026-04-16. -->

---
name: base-ui-solid-port
description: >
  Master guide for porting the Base UI headless component library from React to SolidJS.
  Use this skill whenever working on the base-ui-solid project, migrating React components or hooks to Solid,
  fixing ported tests, updating documentation examples, or reviewing any diff from the upstream React source.
  Triggers on: any mention of base-ui-solid, porting React to Solid, SolidJS migration, fixing solid tests,
  updating solid components, reviewing React diffs for porting. Always consult this skill before touching
  any file in packages/solid or apps/docs-solid.
---

# Base UI → SolidJS Porting Guide

## Core Directive

You are helping port the **Base UI** headless UI library from React to SolidJS.

### Workspace Rules (CRITICAL)

| Directory | Status | Rule |
|---|---|---|
| `packages/react/` | 🔒 READ-ONLY | Never modify. Upstream mirror. |
| `apps/docs/` | 🔒 READ-ONLY | Never modify. Upstream mirror. |
| `packages/solid/` | ✅ TARGET | All library work happens here. |
| `apps/docs-solid/` | ✅ TARGET | All docs work happens here. |

**The React source is the reference spec. Your job is to replicate behavior in idiomatic SolidJS — never modify React files.**

---

## 0. SolidJS Mental Model

**Components are setup functions that run once, not render functions.** All reactive behavior — reading signals, tracking dependencies, updating the DOM — happens through the reactive primitives declared inside that single execution, not through re-runs of the component function.

Practical consequence: signals must be accessed inside reactive contexts (JSX expressions, `createEffect`, `createMemo`, `on()`). Reading a signal outside these contexts captures its value at setup time and does not track updates.

---

## 1. Reactivity & State Mapping

### useState

| React | Solid | Notes |
|---|---|---|
| `useState(primitive)` | `createSignal(primitive)` | Call getter as `value()` in JSX and reactive contexts |
| `useState(object/array)` | `createStore(object)` | Access as `store.field` (proxy) |

```tsx
// React
const [count, setCount] = useState(0);
const [state, setState] = useState({ open: false, value: null });

// Solid
const [count, setCount] = createSignal(0);
const [state, setState] = createStore({ open: false, value: null });
// Usage: count() in JSX, state.open in JSX
```

### useReducer / useMemo

```tsx
// Simple derivation → derived signal (plain function)
const isDisabled = () => props.disabled || contextDisabled();

// Expensive computation → createMemo
const sortedItems = createMemo(() => heavySort(items()));
```

`createMemo` caches its result and only recomputes when dependencies change — prefer it for anything called frequently or doing real work. Never put side effects inside `createMemo`; it is a pure computation primitive.

### Functional updates

When new state depends on the previous value, use the updater function form:

```tsx
setCount((prev) => prev + 1);
```

### Store updates — path syntax

For nested store mutations, use Solid's path syntax rather than spreading:

```tsx
// ✅ Fine-grained, correct
setStore("users", 0, "name", "Jane");

// For complex mutations, use produce
import { produce } from 'solid-js/store';
setStore(produce(draft => {
  draft.users[0].name = "Jane";
  draft.users[0].active = true;
}));
```

### Explicit effect dependencies

Use `on()` when you want to be explicit about what an effect tracks:

```tsx
import { on } from 'solid-js';

createEffect(on(count, (value) => {
  console.log('count changed to', value);
}));

// Multiple deps
createEffect(on([open, value], ([isOpen, val]) => { ... }));

// Wrap store prop in arrow for on():
createEffect(on(() => store.value, fn)); // ✅
// NOT: on(store.value, fn) — this reads the value at setup time, not reactively
```

### Opting out of tracking

Use `untrack()` to read a signal or store value without subscribing to it:

```tsx
import { untrack } from 'solid-js';

createEffect(() => {
  const a = tracked();         // effect re-runs when this changes
  const b = untrack(() => b()); // read without subscribing
});
```

### { equals: false }

Use when a signal should always notify subscribers even if the value is referentially the same (e.g. for trigger-style signals):

```tsx
const [trigger, fireTrigger] = createSignal(undefined, { equals: false });
```

### useCallback

**Drop entirely.** SolidJS does not re-render components, so functions never need to be memoized for stability. Port as a named `function` declaration:

```tsx
// React
const handleClick = useCallback(() => doSomething(value), [value]);

// Solid
function handleClick() {
  doSomething(value());
}
```

### Custom React Hooks (useEventCallback, useEnhancedEffect, etc.)

Do **not** port these as hook abstractions. Inline standard Solid reactivity instead.

---

## 2. Effects & Lifecycle

### Effect Translation Table

| React | Solid | When to use |
|---|---|---|
| `useEffect` | `createEffect` | General reactive side-effects |
| `useLayoutEffect` | `createEffect` | Same — Solid's createEffect runs synchronously like layout effects |
| `useModernLayoutEffect` / `useIsoLayoutEffect` | `createEffect` | Any Base UI layout effect variant |
| Event handler setup/teardown | `onMount` + `onCleanup` | When handler doesn't need re-attachment |
| Mount/unmount logic | `onMount` + `onCleanup` | Once-per-lifecycle setup |

### Cleanup inside effects

Always call `onCleanup` inside `createEffect` (not returning a function like React) for subscriptions, intervals, or listeners that need teardown:

```tsx
createEffect(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));
});
```

### Event Handler Pattern

If the handler itself is not reactive — i.e. it reads signals internally but doesn't need to be re-created — define it outside `onMount`. Then `onMount` only attaches/detaches the listener, and all reactivity is handled inside the handler:

```tsx
// ✅ Best — handler defined once at component setup, registered once on mount
function handleKeyDown(e: KeyboardEvent) {
  if (isDisabled()) return; // reads signal fresh on every call
  doSomething();
}

onMount(() => {
  document.addEventListener('keydown', handleKeyDown);
  onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
});

// ✅ Also fine when handler needs closure over setup-time values
onMount(() => {
  function handler(e: KeyboardEvent) {
    if (isDisabled()) return;
    doSomething();
  }
  document.addEventListener('keydown', handler);
  onCleanup(() => document.removeEventListener('keydown', handler));
});

// ❌ Avoid — re-registers handler on every isDisabled() change
createEffect(() => {
  function handler(e: KeyboardEvent) {
    if (isDisabled()) return;
    doSomething();
  }
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
});
```

### Batching

Solid does **not** batch state updates automatically (unlike React). If multiple setters must run together without triggering intermediate effects:

```tsx
import { batch } from 'solid-js';

// Wrap critical multi-setter calls
batch(() => {
  setOpen(false);
  setHighlightedIndex(-1);
  setInputValue('');
});
```

Note: event handlers in Solid's JSX (`onClick`, etc.) are automatically batched. Use explicit `batch()` for updates triggered outside event handlers (timers, async callbacks, effects).

---

## 3. Refs

Choose the ref pattern based on usage scope:

### Local DOM Ref (component-only)

```tsx
let ref = null as HTMLDivElement | null;
// Usage: <div ref={ref} />
```

Note: `let ref: HTMLDivElement | null | undefined = null` causes TypeScript to infer the type as `null` — use the `as` cast form above instead.

Refs are assigned after render — always read them inside `onMount` or effects, never at setup time.

### Non-Reactive Context Ref (shared, no reactivity needed)

Mimics React's `useRef` stable object pattern:

```tsx
import { useRef } from '../solid-helpers'; // adjust path
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current holds the element
// Pass inputRef through context — .current updates in place
```

### Reactive Context Ref (shared, needs reactivity)

```tsx
const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
// Pass both getter and setter through context
// Consumers: ref() to read, setRef(el) to assign
```

---

## 4. Props

### Never destructure props

Destructuring breaks Solid's reactivity by capturing values at setup time:

```tsx
// ❌ Breaks reactivity
const MyComponent = ({ disabled, label }) => { ... };

// ✅ Correct — access via props object
const MyComponent = (props) => {
  return <button disabled={props.disabled}>{props.label}</button>;
};
```

### Porting destructured React props with defaults

When React destructures a prop with a default (`const { disabled: disabledProp = false } = props`), port it as a derived signal:

```tsx
// React
const { disabled: disabledProp = false } = props;

// Solid
const disabledProp = () => props.disabled ?? false;
// Use createMemo if the derivation is expensive
```

### splitProps

Use `splitProps` to separate component-local props from pass-through element props, avoiding manual omission:

```tsx
import { splitProps } from 'solid-js';

const [local, elementProps] = splitProps(props, ['disabled', 'onSelect']);
// local.disabled, local.onSelect — component-owned
// elementProps — spread onto the DOM element
```

For multiple splits (common in Base UI's render prop pattern):

```tsx
const [local, renderProps, rest] = splitProps(props, ['disabled'], ['render', 'class']);
```

### Default values with mergeProps

Use `solidMergeProps` (aliased import — see Section 5) to apply defaults reactively:

```tsx
import { mergeProps as solidMergeProps } from 'solid-js';

const props = solidMergeProps({ disabled: false, size: 'md' }, rawProps);
```

---

## 5. Render Props & Polymorphism

Base UI's `render` prop maps to an internal `<Dynamic />` abstraction. Transform as follows:

### String (tag name)

```tsx
// React
render={<span />}

// Solid
render="span"
```

### Element with static props

```tsx
// React
render={<span some="prop" class="test-1" />}

// Solid — must manually spread + merge props
render={(props) => <span {...props} some="prop" class={`${props.class} test-1`} />}
```

### Custom Component

```tsx
// React
render={<CustomComponent some="prop" />}

// Solid — object form (preferred when no class merging needed)
render={{ component: CustomComponent, some: "prop" }}

// Solid — function form (when class or prop merging is needed)
render={(props) => <CustomComponent {...props} some="prop" />}
```

### mergeProps Alias (IMPORTANT)

Base UI has its own internal `mergeProps`. When you need SolidJS's built-in version, always alias it on import:

```tsx
import { mergeProps as solidMergeProps } from 'solid-js';
```

---

## 6. JSX & DOM Patterns

### class, style, and conditional classes

```tsx
// class, not className
<div class="btn" />

// Reactive inline styles — also supports CSS custom properties
<div style={{ color: color(), "--my-var": value() }} />

// Static class + reactive conditional classes — use classList for the reactive part
<div class="btn" classList={{ active: isActive(), disabled: isDisabled() }} />

// Never mix reactive class={x()} with classList — use one or the other reactively
```

### Input events — onChange → onInput

React's `onChange` on inputs fires on every keystroke (it wraps the native `input` event). Solid's `onChange` is the native DOM `change` event, which fires only on blur/commit. To replicate React's behavior, use `onInput`:

```tsx
// React — fires on every keystroke
<input onChange={(e) => setValue(e.target.value)} />

// Solid — use onInput to fire on every keystroke
<input onInput={(e) => setValue(e.target.value)} />

// Solid — onChange fires only when input loses focus (native behavior)
<input onChange={(e) => handleCommit(e.target.value)} />
```

This applies to `<input>`, `<textarea>`, and `<select>` (for select, `onChange` native behavior is usually fine).

### Event handling

```tsx
// onClick — delegated, fine for most cases
<button onClick={() => props.onClick?.()} />

// on:click — native (non-delegated), use for stopPropagation, capture, passive, or custom events
<div on:click={(e) => { e.stopPropagation(); handle(e); }} />

// Events are not reactive — conditions go inside the handler, not outside
<button onClick={() => { if (!props.disabled) doSomething(); }} />
```

### Control flow — never use .map() in JSX

```tsx
// ❌ Don't use .map() in JSX
{items().map(item => <li>{item.name}</li>)}

// ✅ Use <For> for object arrays (item is value, index is signal)
<For each={items()}>{(item, index) => <li>{item.name}</li>}</For>

// ✅ Use <Index> for primitive arrays or input lists (item is signal, index is number)
<Index each={items()}>{(item, index) => <input value={item()} />}</Index>

// ✅ Conditionals
<Show when={isOpen()} fallback={<Closed />}>
  <Open />
</Show>

// ✅ Type narrowing with Show callback
<Show when={user()}>{(u) => <span>{u().name}</span>}</Show>

// ✅ Multiple conditions — fallback renders when no Match hits
<Switch fallback={<NotFound />}>
  <Match when={status() === 'loading'}><Spinner /></Match>
  <Match when={status() === 'error'}><Error /></Match>
  <Match when={status() === 'success'}><Content /></Match>
</Switch>

// ✅ Async data — use Suspense, not loading flag conditionals
<Suspense fallback={<Spinner />}>
  <AsyncComponent />
</Suspense>
```

### Directives

Use `use:directiveName={accessor}` for reusable DOM behaviors. Always call `onCleanup` inside the directive for teardown:

```tsx
function tooltip(el: HTMLElement, accessor: () => TooltipOptions) {
  const tip = createTooltip(el, accessor());
  onCleanup(() => tip.destroy());
}

// Usage
<div use:tooltip={{ content: 'Hello' }} />
```

### Error boundaries

Use `<ErrorBoundary>` for render-time errors only. Event handler and `setTimeout` errors won't be caught — use `try/catch` there instead:

```tsx
<ErrorBoundary fallback={(err, reset) => <div onClick={reset}>Error: {err.message}</div>}>
  <MightThrow />
</ErrorBoundary>
```

---

### Import Replacements

| React (remove) | Solid (use instead) |
|---|---|
| `@testing-library/react` | `@solidjs/testing-library` |
| `@testing-library/user-event` | unchanged |
| `createRenderer, flushMicrotasks, describeConformance` | `#test-utils` |

```tsx
// React test
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Solid test
import { render, screen, fireEvent, waitFor, within } from '@solidjs/testing-library';
```

### Synchronicity Rules

```tsx
// React → Solid
flushSync(() => { ... })  →  remove entirely (Solid is sync by default)

// Async: use flushMicrotasks() from #test-utils where async behavior is tested
import { flushMicrotasks } from '#test-utils';
await flushMicrotasks();
```

### Common Test Fixes Checklist

When fixing broken tests after a React version bump:

1. Check for new `flushSync` calls → remove them
2. Check for new `act()` wrappers → remove them (do not replace with `flushMicrotasks()`)
3. Check for new `forwardRef` patterns → apply ref rules from Section 3
4. Check for new render prop shapes → apply Section 5 patterns
5. Check for new hooks → apply Section 1–2 translation rules
6. Check for `className` → `class` in component props
7. Check for `onChange` on `<input>` or `<textarea>` → change to `onInput` (see Section 6)
8. Check for React-specific event names (`onChange` on non-input elements) → use Solid equivalents

---

## 8. Documentation & MDX (apps/docs-solid)

All `.mdx` files and interactive examples in `apps/docs-solid` follow **the exact same rules above**.

Additional JSX differences to watch for in docs examples:

- `className` → `class`
- `htmlFor` → `for`
- `style={{ color: 'red' }}` — object style syntax works in Solid JSX the same way
- Signal getters must be called: `{value}` (React) → `{value()}` (Solid) when `value` is a signal

---

## 9. Shared Packages & Utilities

### packages/utils (and any future shared package)

`packages/utils` contains utilities that may be universal or React-specific. Apply this decision tree for every utility you encounter — and for **any new package or app** that appears in the project:

```
Does the file import anything from 'react', 'react-dom',
or any React-specific library?
│
├── NO  → Framework-agnostic. Import and use directly in packages/solid.
│          Do not copy. Do not modify.
│
└── YES → Framework-specific. Copy the file to packages/solid/src/utils/
           and translate it using the porting rules in this document.
           The original in packages/utils remains untouched (read-only intent).
```

**Practical check:** scan the file's imports. If you see any of these, it's React-specific and must be copied + translated:

- `import ... from 'react'`
- `import ... from 'react-dom'`
- `import ... from '@testing-library/react'`
- Any hook starting with `use` that originates from a React package

**When copying to `packages/solid/src/utils/`:**
- Keep the same filename
- Translate all React patterns using the rules in Sections 1–4
- Update the import path in any Solid file that references it

### Generalizing This Rule

This same logic applies to **every directory in the monorepo**, now and in the future:

| Package/App type | Read-only? | Framework-agnostic util | Framework-specific util |
|---|---|---|---|
| `packages/react/` | 🔒 always | — | — |
| `apps/docs/` | 🔒 always | — | — |
| `packages/utils/` | 🔒 prefer | use directly | copy → `packages/solid/src/utils/` |
| `packages/solid/` | ✅ target | import from source | translate in-place |
| `apps/docs-solid/` | ✅ target | import from source | translate in-place |
| any new `packages/X/` | check for React imports | use directly | copy + translate to Solid equivalent |
| any new `apps/X/` | check for React imports | use directly | copy + translate to Solid equivalent |

When a new package or app appears in the project, **always inspect its imports before deciding** whether to reuse or translate.

---

## 10. Porting Workflow

When given a React diff or asked to update a Solid file:

1. **Read** the React file / diff (read-only reference)
2. **Check shared utilities** — if new utils are introduced, apply the Section 9 decision tree
3. **Identify** the corresponding Solid file at the same path under `packages/solid/`
4. **Translate** using the rules above — do not copy React code verbatim
5. **Preserve** variable names, function names, and structural organization as closely as possible
6. **Never** update `packages/react/`, `apps/docs/`, or the original copy of any framework-agnostic util

### Quick Reference Cheatsheet

```
useState(primitive)          → createSignal()
useState(object)             → createStore()
useReducer (simple)          → derived signal () => ...
useMemo                      → createMemo()
useCallback                  → remove, use function declaration
useEffect                    → createEffect()
useLayoutEffect              → createEffect()
useRef (local)               → let ref = null as T | null
useRef (context)             → useRef() from solid-helpers
forwardRef                   → see Section 3
flushSync                    → remove
act()                        → remove
className                    → class
htmlFor                      → for
onChange on input/textarea   → onInput
.map() in JSX                → <For> or <Index>
{!loading && <X />}          → <Show when={...}>
@testing-library/react       → @solidjs/testing-library
{ disabled: x = false }      → const x = () => props.disabled ?? false
```
