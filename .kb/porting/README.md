# `.kb/porting/` — porting playbooks

Cross-cutting recipes for porting React Base UI components to Solid.
**Routing only — no implementation detail lives here.** Detail lives in
[`../solid/`](../solid/) topic files (refs, effects, events, etc.) and in
[`../components/<name>.md`](../components/) per-component files.

## Files

- [`./playbook.md`](./playbook.md) — generic step ordering for porting any
  component.
- [`./floating-root-context.md`](./floating-root-context.md) — the
  `floatingRootContext` parity rules (dynamic replacement vs stable
  identity) and the file references that prove them.

## See also

- Workflow recipe (task-shaped, with checklist):
  [`../workflows/porting-a-new-component.md`](../workflows/porting-a-new-component.md).
- The single most important pointer: the Cursor porting skill at
  `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md`
  (snapshot at [`../_snapshots/cursor-base-ui-solid-port.SKILL.md`](../_snapshots/cursor-base-ui-solid-port.SKILL.md)).
