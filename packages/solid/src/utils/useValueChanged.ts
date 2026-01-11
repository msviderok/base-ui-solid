import { createEffect, on } from 'solid-js';
import { type MaybeAccessor, access } from '../solid-helpers';

export function useValueChanged<T>(value: MaybeAccessor<T>, onChange: (previousValue: T) => void) {
  createEffect(
    on(
      () => access(value),
      (val) => onChange(val),
    ),
  );
}
