<!--
TEMPLATE — copy to a new file under concepts/ and fill in. Delete this comment.
Layer: concept (framework-agnostic). Same basename should exist in react/ and solid/.
Required sections: Problem, Mental model, Invariants, Actors / state, Cross-references.
Optional: Sequence (only when ordering matters).
-->

# <Topic name>

> Layer: **concept** (framework-agnostic).
> React reality: [../react/<this-file>.md](../react/<topic>.md)
> Solid reality: [../solid/<this-file>.md](../solid/<topic>.md)

## Problem

<1–3 sentences. Why does this exist? What goes wrong without it?>

## Mental model

<The minimum vocabulary needed to read the rest of the doc. Bullets, not prose.>

## Invariants

<Numbered list of rules that must hold regardless of framework. These are the
contract both layers must satisfy.>

1.
2.

## Actors / state

<Tables or bullets. Names MUST match across react/ and solid/ layers — they are
the join key. If a name has to change, change it in all three files.>

| Actor | Role |
| :---- | :--- |
|       |      |

## Sequence (optional — only when ordering matters)

<Numbered, framework-free steps. Refer to actors and state by name, not to hooks.>

## Cross-references

- React layer: [../react/<topic>.md](../react/<topic>.md)
- Solid layer: [../solid/<topic>.md](../solid/<topic>.md)
- Glossary terms used: [../glossary.md](../glossary.md)
