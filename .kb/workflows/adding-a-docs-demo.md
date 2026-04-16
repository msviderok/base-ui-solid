# Workflow: adding a docs demo (Solid)

## When to use

You need to add a new demo (or port a React demo) to the Solid docs site
under `docs-solid-v2/`.

## Inputs you need

- **Component name** (kebab-case for paths, PascalCase for component).
- **Demo name** (e.g. `hero`, `controlled`, `with-arrow`). If unsure,
  default to `hero`.
- Which **styling form**: CSS Modules, Tailwind, or both. The repo
  default for hero demos is **both**.
- Whether the demo must also exist in the React docs at
  `docs/src/app/(docs)/react/<component>/` for parity.

## Steps

1. **Find the React reference demo.** Look under
   `docs/src/app/(docs)/react/<component>/` (or
   `docs/src/app/(private)/experiments/` if it's an experiment). Read
   both styling variants.

2. **Mirror the directory layout** in `docs-solid-v2`:

   ```text
   docs-solid-v2/src/demos/solid/<component>/<demo>/css-modules/
   docs-solid-v2/src/demos/solid/<component>/<demo>/tailwind/
   ```

   Use existing components' `hero` demos as the styling reference. From
   repo `AGENTS.md`: do not add custom styling beyond the critical
   layout styles.

3. **Translate JSX to Solid.** Apply the rules from
   [`../solid/reactivity-rules.md`](../solid/reactivity-rules.md):

   - `useState` → `createSignal` (read as `value()`).
   - `useRef` → `useRef` from `solid-helpers` (`.current`).
   - Event handlers: `onInput` (not `onChange`) for typing-driven
     updates; `on:click` only when crossing iframe boundaries.
   - Empty boolean ARIA attrs: explicit `aria-hidden="true"`, not bare.

4. **Wire the demo into the docs page.** Update
   `docs-solid-v2/src/content/solid/components/<component>.mdx` to
   reference the new demo. Match how other demos on the same page are
   declared.

5. **Verify in the browser.** Per repo `AGENTS.md`: for UI / frontend
   changes, start the dev server and use the feature in a browser.
   Manually click through the golden path and obvious edge cases. Watch
   the browser console for errors.

6. **Lint + format:**

   ```bash
   pnpm typescript
   pnpm eslint
   pnpm prettier
   pnpm stylelint
   pnpm markdownlint
   ```

7. **Update the component's KB file.** In
   [`../components/<name>.md`](../components/), bump the "Docs ported"
   row in the status table if this demo brings the component over a
   threshold (partial → yes).

## Done when

- [ ] Both `css-modules/` and `tailwind/` variants exist (when both were
  in scope).
- [ ] The MDX page references the new demo and renders without errors.
- [ ] Manual browser walk-through passes the golden path and obvious
  edge cases.
- [ ] All lint commands above are clean.
- [ ] `components/<name>.md` "Docs ported" status reflects reality.

## See also

- [`./porting-a-new-component.md`](./porting-a-new-component.md) — when
  the component itself isn't yet ported.
- Repo `AGENTS.md` "Project structure" section for the docs/demos rules.
