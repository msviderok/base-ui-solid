# State-driven DOM attributes

> Layer: **concept** (framework-agnostic).
> React reality: [`../react/render-element.md`](../react/render-element.md)
> Solid reality: stub — see [`../solid/_template.md`](../solid/_template.md)

## Problem

Headless components expose state to the consumer's CSS via DOM attributes
instead of class names. Consumers style the closed/open/disabled/animating
states by selecting on `data-*` attributes set by the runtime — no class
name conflicts, no JS-managed style rules.

## Mental model

The runtime maintains a state object per component (e.g. `{ open: true,
disabled: false, transitionStatus: 'starting' }`). A mapping table converts
state to DOM attributes; a render helper applies them.

| State | Attribute(s) when truthy |
| :--- | :--- |
| `open: true` | `data-open` |
| `open: false` | `data-closed` |
| `disabled: true` | `data-disabled` |
| `transitionStatus: 'starting'` | `data-starting-style` |
| `transitionStatus: 'ending'` | `data-ending-style` |

Mutually exclusive states (e.g. open vs closed) get one attribute each — never
both at once.

## Invariants

1. Attributes are **styling hooks**, not browser signals. They mean nothing
   to the browser by themselves.
2. The mapping table is the single source of truth. State value → attribute
   name conversion lives in one file per component / per shared mapping.
3. A consumer's CSS selector on `[data-starting-style]` is the contract.
   Renaming the attribute breaks every consumer.

## Actors / state

| Actor | Role |
| :--- | :--- |
| State object | Per-component reactive state. |
| Mapping function | `(state) → { [attr]: value }`. |
| Render helper | Applies the mapping output to the rendered element. |

## CSS contract example

Collapsible's panel:

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

The runtime never authors styles. It only sets attributes and CSS variables.
The cascade does the rest.

## Cross-references

- Used by collapsible: [`./collapsible-animation.md`](./collapsible-animation.md)
- React render helper: [`../react/render-element.md`](../react/render-element.md)
- Glossary entries: `data-open`, `data-starting-style`, `data-ending-style`
