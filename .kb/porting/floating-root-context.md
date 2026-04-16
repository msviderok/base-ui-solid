# `floatingRootContext` parity — porting

> Layer: **porting** (cross-cutting).
> Related Solid topic: [`../solid/reactivity-rules.md`](../solid/reactivity-rules.md).

## What this is

The React Base UI codebase uses `floatingRootContext` in two distinct
ways. The Solid port must preserve both shapes — getting the choice wrong
silently breaks position updates or breaks listener identity. This file
documents which shape applies where, and points at the React file
references that prove it.

## The two shapes

### Shape 1 — Dynamic replacement (NavigationMenu only)

`NavigationMenu` swaps the floating root context when the active trigger
changes:

- `setFloatingRootContext(context)` on the active trigger.
- `setFloatingRootContext(undefined)` on close / unmount.

**Why:** the menu's positioning anchor moves between triggers; each
trigger needs its own context identity.

### Shape 2 — Stable identity + field updates (everywhere else)

Outside `NavigationMenu`:

- `useFloatingRootContext` / `useSyncedFloatingRootContext` create the
  context **once** and return the same identity for the lifetime of the
  consumer.
- Subsequent updates use `store.update(...)` to mutate fields on that
  stable object, NOT to replace the object.

**Why:** consumers compare context identity to skip re-subscriptions; if
the identity changes, subscribers thrash.

### Popup-store initialization pattern

Popup stores (popover, dialog, menu, preview-card, tooltip) follow a
specific bootstrap:

1. Construct with `getEmptyRootContext()` as the initial value.
2. **One-time switch** to the real synced context once it's available.
3. After that switch, only field-level updates run.

The "switch" is identity-checked — you switch from the placeholder
identity exactly once.

## React file references

These are the upstream React files that demonstrate each shape. Read them
when porting to confirm the Solid version matches.

### Dynamic replacement (`NavigationMenu`)

- `packages/react/src/navigation-menu/root/NavigationMenuRoot.tsx:77`
- `packages/react/src/navigation-menu/root/NavigationMenuRoot.tsx:100`
- `packages/react/src/navigation-menu/root/NavigationMenuRoot.tsx:141`
- `packages/react/src/navigation-menu/trigger/NavigationMenuTrigger.tsx:156`
- `packages/react/src/navigation-menu/trigger/NavigationMenuTrigger.tsx:178`

### Stable identity (`create once, update fields`)

- `packages/react/src/floating-ui-react/hooks/useFloatingRootContext.ts:40`
- `packages/react/src/floating-ui-react/hooks/useFloatingRootContext.ts:54`
- `packages/react/src/floating-ui-react/hooks/useFloatingRootContext.ts:70`
- `packages/react/src/floating-ui-react/hooks/useSyncedFloatingRootContext.ts:26`
- `packages/react/src/floating-ui-react/hooks/useSyncedFloatingRootContext.ts:27`
- `packages/react/src/floating-ui-react/hooks/useSyncedFloatingRootContext.ts:44`
- `packages/react/src/floating-ui-react/hooks/useSyncedFloatingRootContext.ts:58`
- `packages/react/src/floating-ui-react/hooks/useSyncedFloatingRootContext.ts:74`

### Popup-store placeholder + one-time switch + identity-checked sync

- `packages/react/src/utils/popups/store.ts:84`
- `packages/react/src/floating-ui-react/utils/getEmptyRootContext.ts:5`
- `packages/react/src/popover/root/PopoverRoot.tsx:118`
- `packages/react/src/popover/root/PopoverRoot.tsx:148`
- `packages/react/src/dialog/root/useDialogRoot.ts:60`
- `packages/react/src/dialog/root/useDialogRoot.ts:157`
- `packages/react/src/menu/root/MenuRoot.tsx:394`
- `packages/react/src/menu/root/MenuRoot.tsx:544`
- `packages/react/src/preview-card/store/PreviewCardStore.ts:115`
- `packages/react/src/preview-card/store/PreviewCardStore.ts:122`
- `packages/react/src/preview-card/store/PreviewCardStore.ts:124`
- `packages/react/src/tooltip/store/TooltipStore.ts:125`
- `packages/react/src/tooltip/store/TooltipStore.ts:132`
- `packages/react/src/tooltip/store/TooltipStore.ts:134`
- `packages/utils/src/store/ReactStore.ts:87`
- `packages/utils/src/store/ReactStore.ts:107`
- `packages/utils/src/store/Store.ts:80`
- `packages/utils/src/store/Store.ts:82`

## Notes for the Solid port

- These line numbers reflect upstream React at the time SolidStuff was
  written. They may drift. Treat them as starting anchors, not exact
  truth. After "sync KB" detects upstream change, reverify and re-record.
- The Solid implementations for these patterns live under
  `packages/solid/src/floating-ui-solid/` and
  `packages/solid/src/{popover,dialog,menu,preview-card,tooltip}/` —
  use grep to locate the analogues.
