import { createEffect, on, onCleanup } from 'solid-js';
import { access, type MaybeAccessor } from '../solid-helpers';
import { useAnimationsFinished } from './useAnimationsFinished';

/**
 * Calls the provided function when the CSS open/close animation or transition completes.
 */
export function useOpenChangeComplete(parameters: useOpenChangeComplete.Parameters) {
  const open = () => access(parameters.open);
  const enabled = () => access(parameters.enabled) ?? true;
  const runOnceAnimationsFinish = useAnimationsFinished(() => access(parameters.ref), open, false);

  createEffect(
    on([open, enabled], () => {
      if (!enabled()) {
        return;
      }

      const abortController = new AbortController();

      runOnceAnimationsFinish(parameters.onComplete, abortController.signal);

      onCleanup(() => abortController.abort());
    }),
  );
}

export interface UseOpenChangeCompleteParameters {
  /**
   * Whether the hook is enabled.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether the element is open.
   */
  open?: MaybeAccessor<boolean | undefined>;
  /**
   * Ref to the element being closed.
   */
  ref: MaybeAccessor<HTMLElement | null | undefined>;
  /**
   * Function to call when the animation completes (or there is no animation).
   */
  onComplete: () => void;
}

export namespace useOpenChangeComplete {
  export type Parameters = UseOpenChangeCompleteParameters;
}
