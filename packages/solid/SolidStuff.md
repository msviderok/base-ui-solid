- `ref` cannot be passed within nested params
- `ref` should always be passed as a `<Component ref={someRef} />` in components
- `ref` should always be passed as a `<Component ref={someVariable.someRef} />` when passed to `render` abstraction in tests
- all props for hooks have to be passed as context: plain object with reactive (accessor) properties
- hooks should return accessor instead of object with destructable accessors
- props.children will get resolved eagerly using `children()` helper so when rendered conditionally – always repeat the same condition in the `children()` helper
- flushMicrotasks (act() wrapped) is not needed for Solidjs as it's synchronious
- a lot of type duplication (e.g. `DisabledIndecies` in `floating-ui-react`)
- need to use `@solid-primitives/autofocus` for the native autofocus to work
- there is a need to re-arrange effects and cleanup functions' order due to Solid having cleanups executing bottom-to-top while in React it's top-to-bottom which sometimes executes a wrong order of actions. This would probably require some changes in logic to make it more framework-agnostic.
- Solid has opposite to React order of unmount: in React it's top-to-bottom (first parent unmounts, then child) while in Solid it's bottom-to-top (child unmounts first, then parent) (https://github.com/facebook/react/issues/16728#issuecomment-584208473)
- to reactively bubble events from the iframe – need to use `on:` events as Solid doesn't have the SyntheticEvent layer and so event delegation doesn't work in the iframe
- all the hooks in floating-ui-solid/hooks are ported to `on:` events for the sake of iframe compatibility
- most likely jest-dom versions of react and solid differ as for some reason toBeInTheDocument doesn't work for Solid version when checking against iframe and toBeTruthy needs to be used
- in Solid the empty attributes like `aria-hidden` should be passed as `aria-hidden="true"` contrary to the simplified React's version as Solid renders empty attrivutes with an empty string value (`aria-hidden=""`)
- `use-button` required some amount of rework as in Solid we have three kinds of the same handler, e.g. for click we have `onClick`, `onclick` and `on:click`
- `render` prop needs manual ref set: `render={(props) => <div ref={el => props.ref(el) />}`
- Navigation menu bubble/capture event order is a mess, needed to wrap all the focuses inside focus guards in queueMicrotask as they were running before the event even finished to capture/bubble
- in Solid onInput must be used instaed of onChange to trigger change on every keystroke (as it is in DOM)
- do not put components into createMemo, learned the hard way

# TODO

- Toast demo:
  - animation broken when many toasts added
  - undo toast dissappear when hovered
  - toasts don't get dismissed properly
- Navigation menu is not changing its position on scroll

- TODO: FIX IN SOLID
