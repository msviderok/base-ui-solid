# Events in Solid — Solid

> Layer: **solid** (the port).
> Concept (abstract): no separate concept doc — Solid-specific.
> React reference: n/a (React uses SyntheticEvent + delegation; Solid does not)

## Status

- **Ported:** yes (these rules are applied across the floating-ui-solid
  port and across components that bubble events out of iframes)
- **Verified:** yes
- **Last reviewed:** 2026-04-16

## Divergences from React

- **No SyntheticEvent layer.** Solid does not delegate events through a
  synthetic root. Listeners attach directly to the element (or to
  `document` for native delegation).
- **Three handler shapes for the same event.** For `click`, all of these
  exist and behave differently:

  | Form | Behavior |
  | :--- | :--- |
  | `onClick={fn}` | Solid's delegated handler (works in main document; **not** across iframe boundaries). |
  | `onclick={fn}` | Plain DOM property assignment. |
  | `on:click={fn}` | `addEventListener('click', fn)`. Required for iframe boundaries. |

- **`onInput` instead of `onChange` for typing.** In Solid, `onInput`
  fires on every keystroke (like the DOM event). React's `onChange` is
  Solid's `onInput`. `onChange` in Solid is the native DOM `change` event
  (fires on blur / commit). Use `onInput` whenever you want
  per-keystroke updates.

## Solid-specific implementation notes

### `on:`-form events for iframe compatibility

Because Solid has no SyntheticEvent layer, normal `onClick={...}` handlers
attached inside an iframe **don't bubble through Solid's delegation root**
in the host document. To reactively bubble events out of an iframe:

- Use `on:click={...}` (and `on:` for any other events the host listens to).
- All hooks in `packages/solid/src/floating-ui-solid/hooks/` are ported to
  use `on:` events for this reason.

### Click handler chain in `useButton`

`useButton` required rework because Solid surfaces three click forms
(`onClick`, `onclick`, `on:click`) for the same event. The ported
implementation merges all three so consumer-passed handlers from any form
participate in the click chain.

### Trigger handlers wrap setters in `batch(...)`

Solid only auto-batches inside event-handler scope. When a hook's trigger
handler calls multiple setters that should appear as one update (e.g.
`setMounted`, `setVisible`, `setOpen` in collapsible), wrap them in
`batch(() => { ... })`. Without it, intermediate `createEffect` runs fire
between setters. See `useCollapsibleRoot.ts` (~line 66).

### Focus guards in microtasks (NavigationMenu)

NavigationMenu's bubble/capture event order is fragile in Solid. The
solution: wrap focus moves inside focus guards in `queueMicrotask(...)` so
they run after the current event finished capturing/bubbling. Without
this, focuses ran before the event finished, breaking the menu's focus
flow.

## Known issues / TODOs

None new. Component-specific event quirks live in the relevant
`components/<C>.md` files.

## Files (target)

- `packages/solid/src/floating-ui-solid/hooks/` — all hooks use `on:` events
- `packages/solid/src/use-button/useButton.ts` — three-form click chain
- `packages/solid/src/navigation-menu/` — focus-guard microtask wrappers
- Any input-driven components (`packages/solid/src/{input,combobox,autocomplete,number-field}/`) — use `onInput`, not `onChange`

## Test commands

```bash
pnpm test:solid:jsdom NavigationMenu --no-watch --reporter=agent
pnpm test:solid:chromium NavigationMenu --no-watch --reporter=agent
```
