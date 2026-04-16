# React hooks cheatsheet

> Layer: **react** (upstream, READ-ONLY mirror).
> Concept (abstract): n/a — this is a routing index.
> Solid port: [`../solid/reactivity-rules.md`](../solid/reactivity-rules.md)

## Stub

Index of common Base UI React hooks pending. For the canonical translation
table from React hooks to Solid primitives, see the upstream Cursor porting
skill (Section 1–2):
`~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md`
(snapshot at [`../_snapshots/cursor-base-ui-solid-port.SKILL.md`](../_snapshots/cursor-base-ui-solid-port.SKILL.md)).

Quick pointers in the meantime:

- `packages/react/src/utils/` — most shared hooks live here.
- `packages/utils/src/` — framework-agnostic shared utils (READ-ONLY for the
  Solid port; can be imported directly when not React-specific).
- For repo-wide hook conventions (`useTimeout`, `useStableCallback`,
  `useIsoLayoutEffect`), see [`../../AGENTS.md`](../../AGENTS.md) Code
  guidelines.

When this index is populated, follow [`./_template.md`](./_template.md).
