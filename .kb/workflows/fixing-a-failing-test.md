# Workflow: fixing a failing test (Solid)

## When to use

A test under `packages/solid/src/` is failing and you need to diagnose
and fix it.

## Inputs you need

- **Test name** (or the file path).
- **Environment** that fails: jsdom, chromium, firefox, webkit?
- The **error message** from the test run.
- Whether the test was passing before — and if so, what changed.

## Steps

1. **Reproduce in isolation.**

   ```bash
   pnpm test:solid:jsdom <TestNameOrPattern> --no-watch --reporter=agent
   pnpm test:solid:chromium <TestNameOrPattern> --no-watch --reporter=agent
   ```

   Run only the failing env first.

2. **Classify the failure** (most → least common):

   | Failure shape | Likely cause | Read |
   | :--- | :--- | :--- |
   | Assertion fires before async DOM update | React-style `act()` / `flushMicrotasks` left in test | [`../solid/testing-quirks.md`](../solid/testing-quirks.md) |
   | `toBeInTheDocument()` fails when iframe is involved | jest-dom matcher mismatch | [`../solid/testing-quirks.md`](../solid/testing-quirks.md) |
   | Ref is `undefined` when the test reads it | Ref placement wrong (nested in props, not on top-level component) | [`../solid/refs.md`](../solid/refs.md) |
   | Event handler not firing across an iframe boundary | Using `onClick` instead of `on:click` | [`../solid/events.md`](../solid/events.md) |
   | Click handler fires intermediate effects between setters | Missing `batch(...)` outside event scope | [`../solid/events.md`](../solid/events.md) |
   | `aria-hidden` value mismatch (`""` vs `"true"`) | Solid renders empty attrs as `""` | [`../solid/gotchas.md`](../solid/gotchas.md) GOTCHA-003 |
   | Component re-mounts on signal change | Wrapped in `createMemo` | [`../solid/gotchas.md`](../solid/gotchas.md) GOTCHA-004 |
   | Cleanup logic doesn't see parent state | Solid child-first cleanup order | [`../solid/effects-and-cleanup.md`](../solid/effects-and-cleanup.md) |
   | Animation timing off (collapsible-like) | Phase machine misordering | [`../concepts/transition-status-machine.md`](../concepts/transition-status-machine.md) + [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md) Debugging checklist |

3. **Compare with React.** If a corresponding React test exists at
   `packages/react/src/<component>/<file>.test.tsx`, diff the assertions.
   Surprising differences usually point at the cause.

4. **If still stuck**, drop into the component's
   [`../components/<name>.md`](../components/) — Open issues section may
   already record the bug.

5. **Fix and re-run.** Run the originally failing env first, then the
   other envs to make sure the fix didn't regress anything else:

   ```bash
   pnpm test:solid:jsdom <Pattern> --no-watch --reporter=agent
   pnpm test:solid:chromium <Pattern> --no-watch --reporter=agent
   ```

6. **Lint + typecheck** any source files you touched:

   ```bash
   pnpm typescript
   pnpm eslint
   ```

7. **If the failure exposed a new cross-cutting Solid sharp edge**,
   append it to [`../solid/gotchas.md`](../solid/gotchas.md) as the next
   `GOTCHA-NNN` entry. Component-specific findings go in
   `../components/<name>.md` Open issues.

## Done when

- [ ] The originally failing test passes in its original env.
- [ ] Other envs (at minimum jsdom + chromium) still pass for the same
  pattern.
- [ ] `pnpm typescript` and `pnpm eslint` clean for changed files.
- [ ] If a new cross-cutting gotcha was discovered, it's in
  `../solid/gotchas.md`.

## See also

- [`./porting-a-new-component.md`](./porting-a-new-component.md) — when
  the test failure is for code you just ported.
