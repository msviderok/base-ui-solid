# Workflow: porting a new component (React → Solid)

## When to use

The user asks you to port a Base UI React component to Solid that doesn't
yet exist (or is incomplete) under `packages/solid/src/`.

## Inputs you need

- **Component name** in PascalCase (e.g. `Tooltip`, `NumberField`).
- **Scope:** the whole component, or a specific subpart (e.g. just the
  `Trigger`)?
- Whether **docs + demo** should be ported in this pass, or deferred.

## Steps

1. **Read the React source.** Walk every file in
   `packages/react/src/<component>/` plus any `packages/react/src/utils/`
   imports it uses. Skim is fine on first pass.
2. **Read the porting context** (in this order, skip if already in
   working memory):
   - [`../porting/playbook.md`](../porting/playbook.md) — generic step
     ordering.
   - `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md`
     — translation tables (snapshot:
     [`../_snapshots/cursor-base-ui-solid-port.SKILL.md`](../_snapshots/cursor-base-ui-solid-port.SKILL.md)).
   - [`../solid/reactivity-rules.md`](../solid/reactivity-rules.md) —
     project addenda hub (refs, effects, events, props, testing,
     gotchas).
3. **Identify cross-cutting concerns.** Animations? Floating root
   context? Iframe-bridged events? Each one points at a specific KB file:
   - Animation: [`../concepts/collapsible-animation.md`](../concepts/collapsible-animation.md)
     for the abstract pattern;
     [`../concepts/transition-status-machine.md`](../concepts/transition-status-machine.md)
     for the phase machine.
   - Floating root context: [`../porting/floating-root-context.md`](../porting/floating-root-context.md).
   - Events: [`../solid/events.md`](../solid/events.md).
4. **Translate.** Apply the rules above to produce
   `packages/solid/src/<component>/`. Use `useRef` from `solid-helpers`,
   `createSignal`/`useControlled`, `createEffect`,
   `MaybeAccessor<T>`-shaped params, `batch(...)` in event handlers when
   firing >1 setter, `on:` events when crossing iframe boundaries.
5. **Port the tests.** Drop `act()` and `flushMicrotasks` (Solid is
   synchronous). For browser-only assertions use
   `it.skipIf(isJSDOM)` per repo `AGENTS.md`. Read
   [`../solid/testing-quirks.md`](../solid/testing-quirks.md) before
   writing iframe-related assertions.
6. **Run the test matrix:**

   ```bash
   pnpm test:solid:jsdom <PascalCaseName> --no-watch --reporter=agent
   pnpm test:solid:chromium <PascalCaseName> --no-watch --reporter=agent
   ```

7. **Port the demo** if in scope. See
   [`./adding-a-docs-demo.md`](./adding-a-docs-demo.md).
8. **Lint + typecheck:**

   ```bash
   pnpm typescript
   pnpm eslint
   pnpm prettier
   ```

9. **Update KB.**
   - Create or update `components/<name>.md` from
     [`../components/_template.md`](../components/_template.md). Fill the
     status table truthfully.
   - For any new cross-cutting workaround you discovered, append a
     `GOTCHA-NNN` entry in [`../solid/gotchas.md`](../solid/gotchas.md).

## Done when

- [ ] `packages/solid/src/<component>/` exists and type-checks.
- [ ] jsdom + chromium test commands pass for `<PascalCaseName>`.
- [ ] `pnpm typescript`, `pnpm eslint`, `pnpm prettier` clean for changed
  files.
- [ ] `components/<name>.md` exists in `.kb/` with up-to-date status.
- [ ] Any new cross-cutting workaround has a `GOTCHA-NNN` entry.
- [ ] If docs were in scope: `docs-solid-v2` demo renders without console
  errors.

## See also

- [`../porting/playbook.md`](../porting/playbook.md) — same flow,
  topic-shaped (no checklist).
- [`./fixing-a-failing-test.md`](./fixing-a-failing-test.md) — when step 6
  fails.
