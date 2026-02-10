import { createEffect, createSignal, on, type Accessor } from 'solid-js';

/**
 * Returns a previous value of its argument.
 * @param value Current value.
 * @returns Previous value, or null if there is no previous value.
 */
export function usePreviousValue<T>(value: Accessor<T>): Accessor<T | null> {
  const [state, setState] = createSignal<{ current: T; previous: T | null }>({
    current: value(),
    previous: null,
  });

  createEffect(
    on(value, (currentValue) => {
      setState((prev) => {
        return { current: currentValue, previous: prev.current };
      });
    }),
  );

  return () => state().previous;
}
