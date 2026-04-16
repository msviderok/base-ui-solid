# Glossary

Project-specific vocabulary. If a term used across the KB isn't here, add it.
Sort alphabetically.

---

## `animationType`

Per-panel detected mode: `"css-transition"`, `"css-animation"`, or `"none"`.
Decided once on first panel mount via `getComputedStyle`. Drives which open/close
flow the runtime uses. See
[`concepts/collapsible-animation.md`](./concepts/collapsible-animation.md).

## `beforematch`

Browser event fired when in-page search reveals a `hidden="until-found"` element.
Triggers a special open path that bypasses the trigger handler. See
[`concepts/collapsible-animation.md`](./concepts/collapsible-animation.md).

## `data-ending-style` / `data-starting-style`

DOM data attributes set by the runtime to expose styling hooks to consumer CSS.
Not browser animation signals — just attributes. CSS authored by the consumer
decides what they mean. Always paired with `transitionStatus`. See
[`concepts/state-attributes.md`](./concepts/state-attributes.md).

## `data-open` / `data-closed`

DOM data attributes mapped from the `open` state. Mutually exclusive.

## `hiddenUntilFound`

Component option. When true, the panel stays mounted even when closed and uses
`hidden="until-found"` so browser search can reveal it via `beforematch`.

## `keepMounted`

Component option. When true, the panel stays in the DOM when closed (with
`hidden`) instead of unmounting. Doesn't change animation logic — only render
gating.

## `mounted`

Internal animation-support state. Controls whether the panel element may exist
in the DOM. Distinct from the public `open` state because animations need the
element to outlive the close intent. See
[`concepts/transition-status-machine.md`](./concepts/transition-status-machine.md).

## `open`

The logical, public state of a disclosure component. Source of truth.

## `panel`

The disclosable element whose computed styles are inspected for animation
detection and whose dimensions are measured.

## `transitionDimension`

`"height"` or `"width"`. Decided once alongside `animationType`. Drives whether
collapse animates height or width.

## `transitionStatus`

Phase machine value: `"starting"` | `"idle"` | `"ending"` | `undefined`.
Owned by `useTransitionStatus`. Drives the `data-starting-style` /
`data-ending-style` attributes. See
[`concepts/transition-status-machine.md`](./concepts/transition-status-machine.md).

## `visible`

Internal animation-support state used only for CSS keyframe animations.
Controls whether the `hidden` attribute is applied. Exists because keyframe
exit animations need the element to remain visually present until the
animation completes. See
[`concepts/collapsible-animation.md`](./concepts/collapsible-animation.md).
