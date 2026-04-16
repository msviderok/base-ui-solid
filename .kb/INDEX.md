# `.kb` index

Flat, grep-friendly list of every KB file. Routing logic lives in
[`./README.md`](./README.md) — this is just the inventory.

## Entry & meta

- [`./README.md`](./README.md) — single entry point.
- [`./INDEX.md`](./INDEX.md) — this file.
- [`./glossary.md`](./glossary.md) — project vocabulary.

## Concepts (framework-agnostic)

- [`./concepts/_template.md`](./concepts/_template.md) — schema.
- [`./concepts/collapsible-animation.md`](./concepts/collapsible-animation.md) — populated.
- [`./concepts/transition-status-machine.md`](./concepts/transition-status-machine.md) — populated.
- [`./concepts/state-attributes.md`](./concepts/state-attributes.md) — populated.
- [`./concepts/render-prop-pattern.md`](./concepts/render-prop-pattern.md) — stub.

## React (upstream, READ-ONLY mirror)

- [`./react/_template.md`](./react/_template.md) — schema.
- [`./react/collapsible-animation.md`](./react/collapsible-animation.md) — populated.
- [`./react/refs-and-controllers.md`](./react/refs-and-controllers.md) — populated.
- [`./react/hooks-cheatsheet.md`](./react/hooks-cheatsheet.md) — stub.
- [`./react/render-element.md`](./react/render-element.md) — stub.

## Solid (the port)

- [`./solid/_template.md`](./solid/_template.md) — schema.
- [`./solid/collapsible-animation.md`](./solid/collapsible-animation.md) — populated.
- [`./solid/reactivity-rules.md`](./solid/reactivity-rules.md) — pointer to Cursor solid-rules + project addenda.
- [`./solid/refs.md`](./solid/refs.md) — populated (from SolidStuff).
- [`./solid/effects-and-cleanup.md`](./solid/effects-and-cleanup.md) — populated (from SolidStuff).
- [`./solid/events.md`](./solid/events.md) — populated (from SolidStuff).
- [`./solid/props-and-context.md`](./solid/props-and-context.md) — populated (from SolidStuff).
- [`./solid/testing-quirks.md`](./solid/testing-quirks.md) — populated (from SolidStuff).
- [`./solid/gotchas.md`](./solid/gotchas.md) — append-only registry (GOTCHA-NNN).

## Components

- [`./components/_template.md`](./components/_template.md) — schema.
- [`./components/collapsible.md`](./components/collapsible.md) — full worked example.
- [`./components/popover.md`](./components/popover.md) — known TODO.
- [`./components/select.md`](./components/select.md) — known TODO.
- [`./components/tooltip.md`](./components/tooltip.md) — known TODO.
- [`./components/toast.md`](./components/toast.md) — known issues.
- [`./components/navigation-menu.md`](./components/navigation-menu.md) — known issues.
- All other components: **create on demand** from `_template.md`.

## Porting

- [`./porting/README.md`](./porting/README.md) — routing only.
- [`./porting/playbook.md`](./porting/playbook.md) — step ordering for porting any component.
- [`./porting/floating-root-context.md`](./porting/floating-root-context.md) — populated.

## Workflows

- [`./workflows/_template.md`](./workflows/_template.md) — schema.
- [`./workflows/porting-a-new-component.md`](./workflows/porting-a-new-component.md)
- [`./workflows/fixing-a-failing-test.md`](./workflows/fixing-a-failing-test.md)
- [`./workflows/adding-a-docs-demo.md`](./workflows/adding-a-docs-demo.md)

## Snapshots (drift-detection)

- [`./_snapshots/README.md`](./_snapshots/README.md) — operating rules.
- `_snapshots/AGENTS.md`
- `_snapshots/CLAUDE.md`
- `_snapshots/cursor-base-ui-solid-port.SKILL.md`
- `_snapshots/cursor-solid-rules.AGENTS.md`
- `_snapshots/cursor-testing.SKILL.md`
