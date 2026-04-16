<!--
TEMPLATE — copy to a new file under react/ and fill in. Delete this comment.
Layer: react (upstream, READ-ONLY mirror knowledge). Same basename should
exist in concepts/ and solid/.
Required sections: Files (upstream), How React expresses each concept actor,
Hooks involved.
Optional: React-specific gotchas, Test entry points.
-->

# <Topic name> — React

> Layer: **react** (upstream, READ-ONLY mirror).
> Concept (abstract): [../concepts/<this-file>.md](../concepts/<topic>.md)
> Solid port: [../solid/<this-file>.md](../solid/<topic>.md)

## Files (upstream)

<Bulleted, repo-relative paths into packages/react/, packages/utils/, or docs/.>

- `packages/react/src/<component>/<file>.tsx`
- `packages/react/src/utils/<file>.ts`

## How React expresses each concept actor

<Table mapping the concept's actor names to the React hook/ref/state that
carries them. This is the join with the concept layer.>

| Concept actor | React expression |
| :------------ | :--------------- |
|               |                  |

## Hooks involved

<List with one-line role each. Link to source paths.>

- `useX` — what it does in this topic.

## React-specific gotchas (optional)

<Things that are true because of React semantics: Strict Mode, batching,
useEffect timing, etc. Skip when none.>

## Test entry points (optional)

<Test file paths or commands relevant for this topic.>

- `pnpm test:jsdom <Name> --no-watch`
