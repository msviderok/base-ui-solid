# Gotchas registry — Solid

> Layer: **solid** (the port).
> Concept (abstract): n/a — append-only registry of cross-cutting bugs and
> sharp edges discovered while porting.
> React reference: n/a.

**Append-only.** Each entry gets a stable ID (`GOTCHA-NNN`) so other KB
files can cite it. Don't renumber. If a gotcha turns out to be wrong or
obsolete, mark it `**Obsolete:** <date>` rather than deleting.

## Format

```markdown
## GOTCHA-NNN — <short title>

- **Symptom:** what goes wrong.
- **Cause:** why.
- **Fix / workaround:** what to do.
- **Where it bites:** files / components.
- **Added:** YYYY-MM-DD.
```

---

## GOTCHA-001 — Type duplication across floating-ui-solid

- **Symptom:** Types like `DisabledIndices` (from `floating-ui-react`) end
  up duplicated in the Solid port; type-check feels noisier than React's.
- **Cause:** Solid port can't directly import some React-leaning types
  from `floating-ui-react` because their generics or context shapes assume
  React refs/effects. The pragmatic answer was to copy the type into
  `floating-ui-solid/`.
- **Fix / workaround:** Accept the duplication for now. When upstream
  `floating-ui` exposes framework-agnostic type variants, replace the
  copies and delete this gotcha.
- **Where it bites:** `packages/solid/src/floating-ui-solid/`.
- **Added:** 2026-04-16.

## GOTCHA-002 — Native `autofocus` needs `@solid-primitives/autofocus`

- **Symptom:** `autofocus` attribute on Solid elements doesn't focus the
  element on mount.
- **Cause:** Solid doesn't honor the native `autofocus` attribute the same
  way React does.
- **Fix / workaround:** Use the `autofocus` directive from
  `@solid-primitives/autofocus`. Apply it via Solid's directive syntax on
  the element.
- **Where it bites:** Any ported component that relies on first-render
  autofocus.
- **Added:** 2026-04-16.

## GOTCHA-003 — Empty boolean ARIA attributes need explicit `"true"`

- **Symptom:** `aria-hidden` (passed as a bare attribute) renders as
  `aria-hidden=""` in Solid, not `aria-hidden="true"`. Screen readers and
  some test assertions then disagree.
- **Cause:** Solid renders empty attribute values as the empty string,
  unlike React's simplified handling.
- **Fix / workaround:** Always pass these explicitly: `aria-hidden="true"`,
  `aria-expanded="true"`, etc. Don't rely on the React shorthand.
- **Where it bites:** Anywhere we port React JSX that uses bare ARIA
  booleans.
- **Added:** 2026-04-16.

## GOTCHA-004 — Don't put components inside `createMemo`

- **Symptom:** Components instantiated inside `createMemo(() => <X />)`
  re-create their internal state when dependencies change, causing
  surprising remounts and lost local state.
- **Cause:** `createMemo` returns the **memoized value**; if that value is
  a JSX element (a component), Solid re-creates the component on each
  recomputation. JSX is not memoization-stable in the way `useMemo(<X />)`
  is in React.
- **Fix / workaround:** Don't wrap components in `createMemo`. Use
  `<Show>` / `<Switch>` / direct JSX instead — Solid's compiler handles
  reactivity through them without remounting.
- **Where it bites:** Tempting whenever you migrate a `useMemo(() =>
  <X />, [...])` from React. Resist.
- **Added:** 2026-04-16.
