# Reactivity rules — Solid

> Layer: **solid** (the port).
> Concept (abstract): n/a — pointer + project-specific addenda.
> React reference: [`../react/hooks-cheatsheet.md`](../react/hooks-cheatsheet.md) (stub — points back here)

## Status

- **Ported:** yes (rules in active use)
- **Verified:** yes
- **Last reviewed:** 2026-04-16

## What this file is

Pointer to the canonical Solid reactivity / porting rules, plus
**project-specific addenda** that aren't covered there.

## Canonical sources (do not duplicate)

- `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/solid-rules/AGENTS.md`
  — Solid idioms cheatsheet.
- `~/.cursor/projects/Users-msv-codeforfun-base-ui/skills/base-ui-solid-port/SKILL.md`
  — full React → Solid porting playbook (translation tables for hooks,
  state, effects, refs, context, etc.).

Snapshots: [`../_snapshots/cursor-solid-rules.AGENTS.md`](../_snapshots/cursor-solid-rules.AGENTS.md),
[`../_snapshots/cursor-base-ui-solid-port.SKILL.md`](../_snapshots/cursor-base-ui-solid-port.SKILL.md).

## Project-specific addenda

These extend (do not contradict) the Cursor sources above. Each links to
the deeper KB file for the topic:

- **Refs.** Project conventions on where `ref` may appear, plus render-prop
  ref forwarding pattern → [`./refs.md`](./refs.md).
- **Effects and cleanup.** Cleanup runs child-first (opposite of React).
  Audit cross-component cleanup paths when porting →
  [`./effects-and-cleanup.md`](./effects-and-cleanup.md).
- **Events.** `on:`-form for iframe boundaries; three click-handler
  shapes; `onInput` not `onChange`; `batch(...)` outside event scope →
  [`./events.md`](./events.md).
- **Props, hook params, return shapes.** All hook params reactive,
  `MaybeAccessor<T>` pattern, hooks return accessors, `children()` mirrors
  conditional → [`./props-and-context.md`](./props-and-context.md).
- **Testing quirks.** No `act()` / `flushMicrotasks`; jest-dom matcher
  behavior in iframes → [`./testing-quirks.md`](./testing-quirks.md).
- **Gotchas registry.** Append-only list of cross-cutting Solid sharp
  edges → [`./gotchas.md`](./gotchas.md).

## Known issues / TODOs

None.

## Files (target)

This file is project-wide guidance, not tied to specific source files.

## Test commands

n/a — see individual topic files.
