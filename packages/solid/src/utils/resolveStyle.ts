import type { JSX } from 'solid-js';

/**
 * If the provided style is an object, it will be returned as is.
 * Otherwise, the function will call the style function with the state as the first argument.
 *
 * @param style
 * @param state
 */
export function resolveStyle<State>(
  style: JSX.CSSProperties | ((state: State) => JSX.CSSProperties | undefined) | undefined,
  state: State,
) {
  return typeof style === 'function' ? style(state) : style;
}
