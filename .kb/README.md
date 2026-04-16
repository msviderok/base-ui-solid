# `.kb` — project knowledge base

**Single entry point. Read this file first. Everything else is reachable from here.**

This KB is for the **SolidJS port** of Base UI. It is agent-agnostic — Claude,
Cursor, Codex, etc. — and intentionally terse. Long-form rules live in their
upstream homes (see below); the KB only adds what isn't already discoverable
from those sources or from the source code itself.

---

## What this is

- An **additive layer** on top of upstream Base UI guidance — and the
  **migration sink** for two files that previously lived loose in the repo
  (see [Migrations](#migrations) below).
- Not a replacement for [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md),
  or the Cursor skills. It links to them.
- Organized so the same topic exists at three layers: **concept / react / solid**.

## Upstream sources (do not duplicate, do not edit from here)

- [`../AGENTS.md`](../AGENTS.md) — repo-wide rules from the upstream React Base UI team.
- [`../CLAUDE.md`](../CLAUDE.md) — pointer to `AGENTS.md`.
- `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md` — porting guide (React → Solid).
- `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/solid-rules/AGENTS.md` — Solid idioms cheatsheet.
- `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/testing/SKILL.md` — test command reference.

Verbatim copies of these live under [`./_snapshots/`](./_snapshots/) for drift
detection. See [Sync KB](#sync-kb) below.

---

## The 3-layer model

Every topic has up to three sibling files with the **same basename**:

```text
concepts/<topic>.md   framework-agnostic — the what and why
react/<topic>.md      how upstream React does it (READ-ONLY mirror knowledge)
solid/<topic>.md      how the Solid port does or should do it
```

`grep -r '<topic>' .kb/` returns the triangle.

The Solid file **always exists**. If the topic isn't ported yet, the file
explicitly says so (stub form documented in [`solid/_template.md`](./solid/_template.md)).

---

## How to navigate (routing rules)

| If the question is…                                    | Read first                                                                          |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------- |
| "How does feature X work, in the abstract?"            | `concepts/<topic>.md`                                                               |
| "Why does the React code look like that?"              | `react/<topic>.md`                                                                  |
| "Is this ported? Any Solid divergence? Known gotchas?" | `solid/<topic>.md`                                                                  |
| "What's the status of component C?"                    | `components/<C>.md`                                                                 |
| "How do I port a new component?"                       | [`workflows/porting-a-new-component.md`](./workflows/porting-a-new-component.md)    |
| "A test is failing — where do I start?"                | [`workflows/fixing-a-failing-test.md`](./workflows/fixing-a-failing-test.md)        |
| "How do I add a docs demo?"                            | [`workflows/adding-a-docs-demo.md`](./workflows/adding-a-docs-demo.md)              |
| "What does `<jargon>` mean?"                           | [`./glossary.md`](./glossary.md)                                                    |
| "What rules apply to all Solid code?"                  | [`./solid/reactivity-rules.md`](./solid/reactivity-rules.md)                        |
| "What rules apply to the whole repo?"                  | [`../AGENTS.md`](../AGENTS.md)                                                      |

Flat list of every KB file: [`./INDEX.md`](./INDEX.md).

If a `components/<C>.md` doesn't exist when you need it, **create it from
[`components/_template.md`](./components/_template.md)** — don't skip it. If a
topic file is missing, the Solid layer's stub form (see
[`solid/_template.md`](./solid/_template.md)) is the correct first author.

---

## Critical Solid test commands

`package.json` is canonical. These are mirrored here to avoid an extra hop.

```bash
# pattern: pnpm test:solid:<env> <PascalCaseName> --no-watch [--reporter=agent]
pnpm test:solid:jsdom Collapsible --no-watch --reporter=agent
pnpm test:solid:chromium Collapsible --no-watch --reporter=agent
pnpm test:solid:firefox Collapsible --no-watch --reporter=agent
pnpm test:solid:webkit Collapsible --no-watch --reporter=agent
pnpm test:solid:browsers Collapsible --no-watch --reporter=agent   # all browsers
pnpm test:solid:jsdom:coverage                                     # full suite + coverage
```

`--reporter=agent` produces minimal vitest output suitable for token-efficient
agent runs. **Planned:** `pnpm test:solid:agent:<env>` aliases that bake in
`--reporter=agent`. They don't exist in `package.json` yet — until they do, use
the flag form above.

For React tests and full lint/typecheck/format commands, see
[`../AGENTS.md`](../AGENTS.md). For all package scripts, see
[`../package.json`](../package.json).

---

## Sync KB

When the user types **"sync KB"** (or close paraphrase), do exactly this:

1. **Read snapshots.** For each file in `./_snapshots/` (except `README.md`),
   parse the header comment for source path and last-synced date.
2. **Detect drift.** Read each source path and compare byte-for-byte against
   the snapshot body (everything after the header line). Classify as
   `unchanged` / `changed` / `missing`.
3. **Identify affected KB files** for each changed source: search `.kb/` for
   files referencing the source's basename. Diff source vs snapshot; classify
   each change as additive, modification, removal, or non-substantive.
4. **Apply KB updates first.** Edit affected `.kb/` files. **Do not touch
   snapshot files yet** — partial-failure should leave drift visible on the
   next sync.
5. **Refresh snapshots last.** Overwrite each changed snapshot with the
   current source contents; update its `Last synced: YYYY-MM-DD` header.
6. **Report back** in this exact shape:

   ```text
   Sync KB report — <YYYY-MM-DD>

   Snapshots checked: <N>
     unchanged: <basenames>
     changed:   <basenames>
     missing:   <basenames>

   KB files updated:
     - .kb/<path>: <one-line summary>

   Ambiguous / needs human review:
     - <description>

   Snapshots refreshed: <count>
   ```

The agent **never auto-commits** as part of "sync KB" — commit is a separate,
explicit user action.

Note: "sync KB" is only about *upstream* drift. Internal KB edits (e.g. adding
a new gotcha) are not a sync trigger.

---

## Conventions

- **kebab-case filenames.** Layer is in the path (`concepts/X.md`,
  `react/X.md`, `solid/X.md`), never in the filename.
- **Same basename across layers.** Anchors the 3-layer triangle and makes
  grep work.
- **Stubs are explicit.** A Solid stub must use one of the forms in
  [`solid/_template.md`](./solid/_template.md). Empty files are not allowed.
- **Templates live as `_template.md`** in each folder. Copy and fill.
- **Components are create-on-demand.** Day-one `.kb/components/` only contains
  files that have something concrete to say. Create the file when you first
  touch the component.
- **Strict section schemas.** Every file type has required sections — see its
  `_template.md`. Predictability is the whole point.

---

## Migrations

Files absorbed into this KB and **deleted from their original locations**:

- `packages/solid/SolidStuff.md` → split across [`./solid/refs.md`](./solid/refs.md),
  [`./solid/effects-and-cleanup.md`](./solid/effects-and-cleanup.md),
  [`./solid/events.md`](./solid/events.md),
  [`./solid/props-and-context.md`](./solid/props-and-context.md),
  [`./solid/testing-quirks.md`](./solid/testing-quirks.md),
  [`./solid/gotchas.md`](./solid/gotchas.md),
  [`./porting/floating-root-context.md`](./porting/floating-root-context.md),
  and the affected component files.
- `collapsible-animation-flow.md` → split across
  [`./concepts/collapsible-animation.md`](./concepts/collapsible-animation.md),
  [`./concepts/transition-status-machine.md`](./concepts/transition-status-machine.md),
  [`./concepts/state-attributes.md`](./concepts/state-attributes.md),
  [`./react/collapsible-animation.md`](./react/collapsible-animation.md),
  [`./react/refs-and-controllers.md`](./react/refs-and-controllers.md),
  [`./solid/collapsible-animation.md`](./solid/collapsible-animation.md).
