<!--
TEMPLATE — copy to components/<component>.md and fill in. Delete this comment.
Per-component status tracker + router. NOT for implementation detail — that
lives in solid/ topic files. A component file should fit on one screen.

Create-on-demand: do not pre-create empty stubs for components nobody is
working on. The first agent to touch a component creates the file from this
template.
-->

# <Component name>

## Status

| Aspect                          | Status               |
| :------------------------------ | :------------------- |
| Ported (`packages/solid/`)      | yes / partial / no   |
| Docs ported (`docs-solid-v2/`)  | yes / partial / no   |
| Tests passing (jsdom)           | yes / no / unknown   |
| Tests passing (chromium)        | yes / no / unknown   |
| Last reviewed                   | YYYY-MM-DD           |

## Topics covered

<Routing table. One row per concept/topic file relevant to this component.>

| Topic        | Concept                                          | React                                        | Solid                                        |
| :----------- | :----------------------------------------------- | :------------------------------------------- | :------------------------------------------- |
| <topic-name> | [../concepts/<topic>.md](../concepts/<topic>.md) | [../react/<topic>.md](../react/<topic>.md)   | [../solid/<topic>.md](../solid/<topic>.md)   |

## Source paths

- React (read-only): `packages/react/src/<component>/`
- Solid (target):    `packages/solid/src/<component>/`
- Docs (target):     `docs-solid-v2/src/content/solid/components/<component>.mdx`
- Demos (target):    `docs-solid-v2/src/demos/solid/<component>/`

## Open issues

<Bulleted. Cite ../solid/gotchas.md IDs. Empty when none.>

## Quick test

```bash
pnpm test:solid:jsdom <PascalCaseComponentName> --no-watch --reporter=agent
```
