import type { Accessor } from 'solid-js';
import type { MaybeAccessor } from '../solid-helpers';

export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;
/**
 * Provides a status string for CSS animations.
 * @param open - a boolean that determines if the element is open.
 * @param enableIdleState - a boolean that enables the `'idle'` state between `'starting'` and `'ending'`
 */
export declare function useTransitionStatus(
  open: MaybeAccessor<boolean>,
  enableIdleState?: MaybeAccessor<boolean | undefined>,
  deferEndingState?: MaybeAccessor<boolean | undefined>,
): {
  mounted: Accessor<boolean>;
  setMounted: (newMounted: boolean) => void;
  transitionStatus: Accessor<TransitionStatus>;
};
