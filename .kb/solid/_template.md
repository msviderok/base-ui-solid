<!--
TEMPLATE — copy to a new file under solid/ and fill in. Delete this comment.
Layer: solid (the port). Same basename should exist in concepts/ and react/.
The Solid file ALWAYS exists. If unported, use the stub form (see below).
Required sections: Status, Divergences from React, Solid-specific
implementation notes, Known issues / TODOs, Files (target), Test commands.
-->

# <Topic name> — Solid

> Layer: **solid** (the port).
> Concept (abstract): [../concepts/<this-file>.md](../concepts/<topic>.md)
> React reference: [../react/<this-file>.md](../react/<topic>.md)

## Status

- **Ported:** <yes | partial | no>
- **Verified:** <yes | not yet | regressions known>
- **Last reviewed:** <YYYY-MM-DD>

## Divergences from React

<Bullets. Each item: "X in React → Y in Solid because Z." If empty, write
exactly "Follows React 1:1." — the empty case is itself information.>

## Solid-specific implementation notes

<Refs, effects ordering, batching, on: events, etc. Cite
../solid/reactivity-rules.md and other solid/* files instead of repeating.>

## Known issues / TODOs

<Linked to ../solid/gotchas.md by GOTCHA-NNN ID. Use "None." if there are none.>

## Files (target)

- `packages/solid/src/<component>/<file>.tsx`
- `docs-solid-v2/src/<...>/<file>.tsx`

## Test commands

```bash
pnpm test:solid:jsdom <Name> --no-watch --reporter=agent
pnpm test:solid:chromium <Name> --no-watch --reporter=agent
```

---

## Stub form (when topic is not yet ported / not yet verified)

If applicable, replace the body with one of these and nothing else:

> **Stub.** Follows React 1:1 — see [../react/<topic>.md](../react/<topic>.md). No Solid-specific notes yet.
> Last reviewed: <YYYY-MM-DD>.

> **Stub — TODO: not yet ported.** React reference: [../react/<topic>.md](../react/<topic>.md).
> Last reviewed: <YYYY-MM-DD>.

> **Stub — TODO: needs verification.** React reference: [../react/<topic>.md](../react/<topic>.md).
> Last reviewed: <YYYY-MM-DD>.
