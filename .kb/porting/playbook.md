# Porting playbook — generic step ordering

> Layer: **porting** (cross-cutting).
> See also: [`../workflows/porting-a-new-component.md`](../workflows/porting-a-new-component.md)
> for the task-checklist version of this file.

## What this is

Generic step order for porting **any** Base UI React component to Solid.
The mechanical rules (hook → primitive translation, ref handling, etc.)
live in the Cursor skill —
`~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md`
(snapshot: [`../_snapshots/cursor-base-ui-solid-port.SKILL.md`](../_snapshots/cursor-base-ui-solid-port.SKILL.md)).

This file is the **ordering layer** that the Cursor skill assumes.

## Step order

1. **Identify the React surface.** List every file under
   `packages/react/src/<component>/` and every shared util it imports
   from `packages/react/src/utils/`. Read them all at least skim-deep.

2. **Locate or stub the Solid topic files.** For each cross-cutting
   concern the component touches (animation, refs, events, floating
   root context, etc.), confirm a `solid/<topic>.md` exists. If not,
   create a stub from [`../solid/_template.md`](../solid/_template.md).

3. **Translate hooks → primitives** following the Cursor porting skill.
   Apply the project addenda in [`../solid/reactivity-rules.md`](../solid/reactivity-rules.md):
   refs, effects-and-cleanup ordering, events, props-and-context.

4. **Wire `floatingRootContext`** if the component uses it. See
   [`./floating-root-context.md`](./floating-root-context.md) for which
   parity rule applies (`NavigationMenu` does dynamic replacement;
   everything else is stable identity).

5. **Port the tests.** Drop `act()` / `flushMicrotasks` calls (Solid is
   synchronous). Read [`../solid/testing-quirks.md`](../solid/testing-quirks.md)
   for jest-dom-in-iframe gotchas. Mark browser-only tests with
   `it.skipIf(isJSDOM)` per repo `AGENTS.md`.

6. **Port the docs demo** (`docs-solid-v2/src/demos/solid/<component>/`).
   See [`../workflows/adding-a-docs-demo.md`](../workflows/adding-a-docs-demo.md).

7. **Run the test matrix:**

   ```bash
   pnpm test:solid:jsdom <Name> --no-watch --reporter=agent
   pnpm test:solid:chromium <Name> --no-watch --reporter=agent
   ```

8. **Update KB.** Create or update `components/<name>.md` with the
   status table. Append any new cross-cutting gotchas to
   [`../solid/gotchas.md`](../solid/gotchas.md) (next `GOTCHA-NNN`).

## Done when

- [ ] All files under `packages/solid/src/<component>/` build and
  type-check (`pnpm typescript`).
- [ ] Tests pass in jsdom and chromium.
- [ ] Docs demo renders in `docs-solid-v2`.
- [ ] `components/<name>.md` status table updated to reflect new state.
- [ ] If the port required a new cross-cutting workaround, it's
  registered in `../solid/gotchas.md`.
