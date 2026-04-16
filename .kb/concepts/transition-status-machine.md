# Transition status machine

> Layer: **concept** (framework-agnostic).
> React reality: [`../react/collapsible-animation.md`](../react/collapsible-animation.md) (used by Collapsible, also reused across other components)
> Solid reality: [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md)

## Problem

When a component opens or closes with animation, the consumer's CSS needs a
hook to express the closed visual ("starting style") and the closing visual
("ending style"). The runtime needs phases that distinguish:

- "the element is mounting and the open animation should begin"
- "the element is open and settled"
- "the element is closing and the exit animation should run"
- "the element is fully gone"

Without explicit phases, you can't separate "just mounted, before any animation
frame" from "open and animation finished" — and consumer CSS can't target the
closed visual without flicker.

## Mental model

A 4-value enum bound to the open/mounted state of a disclosable element.

| Value | Meaning |
| :--- | :--- |
| `starting` | Element exists but hasn't yet rendered with the open style. CSS uses this to express the closed look. |
| `idle` | Element is open and settled. No animation in flight. |
| `ending` | Element exists but `open` is `false`. CSS uses this to express the closing look. The exit animation is in flight. |
| `undefined` | Element is fully gone (unmounted or hidden + cleanup complete). |

Two configuration knobs change the machine's behavior:

- **`enableIdleState`** — without it, the machine stays at `starting` while
  open. With it, `starting` decays to `idle` after one frame, exposing the
  "open-and-settled" distinction.
- **`deferEndingState`** — without it, `ending` is set the same render as
  `open` flips to `false`. With it, `ending` is deferred by one animation
  frame.

Collapsible enables both.

## Invariants

1. The transition `starting → idle` must take **at least one frame** so CSS
   has a chance to see `data-starting-style` before it disappears.
2. `ending` must be deferred **only when** the consumer needs the close
   watcher installed before the attribute appears. Without deferral, the
   watcher can miss the transition start.
3. `undefined` is reachable only when `mounted = false` AND `open = false`.

## Actors / state

| Actor | Role |
| :--- | :--- |
| `open` | Public intent. Drives the transitions. |
| `mounted` | "May the element exist?" Owned by this machine. |
| `transitionStatus` | The 4-value enum above. |

State diagram:

```text
                 open=true
              ┌──────────────┐
              │              ▼
   undefined ─┤        starting ──(1 frame)──▶ idle
              │              ▲                  │
              │              │                  │ open=false
              │              │                  ▼
              │   open=true  │             (defer 1 frame)
              │   (abort)    │                  │
              │              └──── ending ◀─────┘
              │                       │
              └─── mounted=false ─────┘
                  (after animations finish)
```

## Sequence

### On open (closed → open)

1. `open` flips to `true`.
2. `mounted` becomes `true` (if not already).
3. `transitionStatus` becomes `starting`.
4. Render. Element gains `data-starting-style`.
5. Schedule one animation frame.
6. On that frame, `transitionStatus` becomes `idle`.
7. Render. Element loses `data-starting-style`.
8. Browser runs the open animation between the closed style and the open
   style.

### On close (open → closed)

1. `open` flips to `false`.
2. `transitionStatus` does **not** change yet.
3. The orchestration layer installs a close watcher.
4. On the next animation frame, `transitionStatus` becomes `ending`.
5. Render. Element gains `data-ending-style`.
6. The watcher sees the attribute appear and begins waiting for animations.
7. When animations settle, the orchestration layer sets `mounted` to `false`.
8. `transitionStatus` clears to `undefined`.

### Why deferring `ending` matters

If `ending` were set the same render as `open` flips, `data-ending-style`
would appear before the watcher exists. The watcher would never fire its
"transition started" callback. The deferral makes the ordering explicit:

```text
1. open = false                         (consumer state change)
2. layout effect installs close watcher (runtime side effect)
3. requestAnimationFrame                (deferral)
4. transitionStatus = ending            (state change)
5. data-ending-style attribute applied  (render)
6. close watcher fires                  (observation)
7. wait for getAnimations() to settle   (orchestration)
```

### Why `idle` exists

Without `idle`, `transitionStatus` would stay at `starting` for the whole
open lifetime. Two problems:

- `data-starting-style` would never go away — the consumer's "closed style"
  would persist visually.
- The orchestration layer wouldn't have a clean signal for "open animation
  has finished, safe to reset measured dimensions back to `auto`".

`idle` is the "open and settled" phase. Cleanup runs only when
`open && transitionStatus === idle`.

## Cross-references

- Used by collapsible: [`../react/collapsible-animation.md`](../react/collapsible-animation.md), [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md)
- Concept that drives this: [`./collapsible-animation.md`](./collapsible-animation.md)
- Attribute mapping: [`./state-attributes.md`](./state-attributes.md)
