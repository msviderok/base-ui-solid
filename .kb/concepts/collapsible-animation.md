# Collapsible animation

> Layer: **concept** (framework-agnostic).
> React reality: [`../react/collapsible-animation.md`](../react/collapsible-animation.md)
> Solid reality: [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md)

## Problem

A disclosure panel needs to open and close with optional animation. The
naive approach — toggle `display` or set `hidden` immediately — kills any
exit animation, because the element is gone before it can animate. Conversely,
keeping the element forever wastes layout, breaks search, and leaks state.

The animation system reconciles three competing needs:

1. **Logical state** must change immediately when the user toggles.
2. **DOM presence** must outlive the close intent so the element can animate out.
3. **Eventually**, when motion settles, the panel must hide or unmount.

## Mental model

There are two layers:

- **Phase state** answers *which animation phase the panel is in* — starting,
  idle, ending, or fully gone. See
  [`./transition-status-machine.md`](./transition-status-machine.md).
- **DOM orchestration** answers *what physically happens at each phase* —
  measure size, install observers, wait for animations, hide, unmount.

Both layers are driven by the same `open` intent but operate on different
timescales. The Phase layer changes instantly (open/close request); the
Orchestration layer waits for the browser.

The runtime detects which animation system is in play exactly once, on first
panel mount, by inspecting `getComputedStyle`:

- **`css-transition`** — a `transition` is declared, no `animation-name`.
- **`css-animation`** — an `animation-name` is declared, no `transition`.
- **`none`** — neither.
- **Both** — invalid; runtime warns and the component is undefined behavior.

## Invariants

1. `open` is the **logical intent**. It flips immediately on user action.
2. The panel element may be present in the DOM after `open` flips to `false` —
   that's how exit animations get to run.
3. `data-starting-style` and `data-ending-style` are **styling hooks**, not
   browser signals. CSS authored by the consumer decides what they mean.
4. `data-ending-style` must appear **after** the close-watcher is installed,
   not before. Otherwise the watcher misses the transition start.
5. Initial-mount-open must **not** animate. The first paint of an
   already-open panel should look settled.
6. A reopen during a close must **abort** the in-flight close cleanup —
   otherwise stale close work hides or unmounts a panel the user just reopened.
7. After an open animation settles, fixed pixel dimensions used for
   transitioning must **revert to `auto`** so natural layout resumes.
8. `keepMounted = true` changes only render gating: the panel stays in the
   DOM with `hidden` instead of unmounting. Animation logic is unchanged.
9. `hiddenUntilFound = true` requires the panel to stay mounted so browser
   `beforematch` can reveal it; it overrides the practical meaning of
   `keepMounted` for that purpose.

## Actors / state

| Actor | Role |
| :--- | :--- |
| `open` | Logical intent. Public source of truth. |
| `mounted` | Animation-support state: may the element exist in the DOM? |
| `transitionStatus` | Phase machine value: `starting` \| `idle` \| `ending` \| `undefined`. |
| `visible` | Animation-support state used **only** for keyframe mode: should `hidden` be applied? |
| `height` / `width` | Measured panel dimensions, exposed as CSS variables. |
| `animationType` | Detected once: `css-transition` \| `css-animation` \| `none`. |
| `transitionDimension` | Detected once: `height` \| `width`. |
| `panel` (DOM) | The element being animated. Inspected for animation mode. |
| `abortController` | Cancels in-flight close cleanup when a reopen interrupts. |
| `beforeMatch` flag | Marks the browser-search reopen path so it bypasses normal flow. |
| `cancelInitialOpenAnimation` | One-shot flag suppressing the first open animation when the panel started open. |

For DOM data attributes mapped from these states, see
[`./state-attributes.md`](./state-attributes.md).

## Sequence (abstract)

The same sequence applies regardless of framework. Hook names belong to the
react/ and solid/ layers; this layer talks only about state transitions and
DOM observations.

### Detection (first mount)

1. Read `getComputedStyle(panel)`.
2. Set `animationType` to `css-transition`, `css-animation`, or `none`.
3. Set `transitionDimension` to `width` or `height` based on orientation
   and the transition's `transition-property`.

### Open — CSS transition mode

1. User toggles. `open` flips to `true`.
2. If panel was unmounted, set `mounted = true` first so the element exists.
3. `transitionStatus` becomes `starting`. `data-starting-style` appears.
4. Measure `scrollHeight` / `scrollWidth`; write them as CSS variables.
5. (Initial open from closed-and-unmounted path only) the runtime forces
   `data-starting-style` an extra time to compensate for one-frame timing.
6. On the next animation frame, `transitionStatus` becomes `idle`.
   `data-starting-style` disappears.
7. Browser runs the transition between the closed style (height = 0) and
   the open style (height = `var(--collapsible-panel-height)`).
8. When the transition settles, dimensions are reset to `undefined` so the
   CSS variables revert to `auto` and natural layout resumes.

### Close — CSS transition mode

1. User toggles. `open` flips to `false`. `mounted` stays `true` for now.
2. Measure current `scrollHeight` / `scrollWidth`; store them as state.
3. Create an abort controller; install a watcher on the panel for
   `data-ending-style` to appear.
4. On the next animation frame, `transitionStatus` becomes `ending`.
   `data-ending-style` appears.
5. The watcher fires. The runtime begins waiting for the panel's animations
   to finish (`panel.getAnimations()`).
6. When animations settle, run cleanup atomically:
   - dimensions → `{ height: 0, width: 0 }`
   - `mounted` → `false`
   - clear the abort controller if still owned by this close
7. `transitionStatus` clears to `undefined`.
8. If `keepMounted = false` and `hiddenUntilFound = false`, the panel
   unmounts. Otherwise it stays in the DOM with `hidden`.

### Open — CSS keyframe mode

Keyframes need the element to remain *visible* (not just present) during the
exit animation. That's why a separate `visible` state exists.

1. If keyframe mode left an inline `animation-name: none` from a prior
   measurement, remove it.
2. If the panel was hidden and unmounted, set `visible = true` and
   `mounted = true`.
3. `open` becomes `true`.
4. The keyframe orchestration temporarily sets `animation-name: none` to
   measure dimensions safely.
5. Store measured dimensions; remove the inline override so the
   attribute-driven CSS animation runs.
6. `transitionStatus` still goes `starting → idle` so consumer CSS that
   relies on `data-starting-style` works identically to transition mode.

### Close — CSS keyframe mode

1. `open` becomes `false`.
2. Temporarily set `animation-name: none` to measure safely; remove again.
3. Create abort controller; wait for `getAnimations()` to settle.
4. On settle: `mounted = false`, `visible = false`, clear abort controller.
5. Only after `visible = false` does `hidden` get applied.

### No animation

1. Open: set `mounted = true`, `open = true`. Done.
2. Close: set `open = false`, then immediately `mounted = false`.

### `beforematch` (browser search reveal)

1. The hidden panel is in the DOM with `hidden = "until-found"`.
2. Browser fires `beforematch` on the panel.
3. Handler sets the `beforeMatch` flag and `open = true`.
4. The runtime forces `transition-duration: 0s` while reopening so the
   reveal doesn't produce a weird transition from the hidden-search state.

### Reopen during close

1. Abort the stored close controller. The pending cleanup short-circuits.
2. Restore `visible` / `mounted` if needed.
3. Begin a fresh open cycle from whatever DOM state is current.

## CSS contract for consumers

Consumer CSS expresses the closed-vs-open visual via the data attributes:

```css
.Panel {
  height: var(--collapsible-panel-height);
  overflow: hidden;
  transition: all 150ms ease-out;
}

.Panel[data-starting-style],
.Panel[data-ending-style] {
  height: 0;
}
```

The runtime sets attributes and CSS variables; the cascade does the visual
work. See [`./state-attributes.md`](./state-attributes.md) for the full
attribute pattern.

## Cross-references

- React layer: [`../react/collapsible-animation.md`](../react/collapsible-animation.md)
- Solid layer: [`../solid/collapsible-animation.md`](../solid/collapsible-animation.md)
- Phase machine in detail: [`./transition-status-machine.md`](./transition-status-machine.md)
- State→attribute mapping: [`./state-attributes.md`](./state-attributes.md)
- Glossary: [`../glossary.md`](../glossary.md)
