import { AnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { batch, createEffect, createSignal, onCleanup } from 'solid-js';
import { access, type MaybeAccessor } from '../solid-helpers';

export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

/**
 * Provides a status string for CSS animations.
 * @param open - an accessor to a boolean that determines if the element is open.
 * @param enableIdleState - a boolean that enables the `'idle'` state between `'starting'` and `'ending'`
 */
export function useTransitionStatus(
  open: MaybeAccessor<boolean>,
  enableIdleState: MaybeAccessor<boolean> = false,
  deferEndingState: MaybeAccessor<boolean> = false,
) {
  const openProp = () => access(open);
  const enableIdleStateProp = () => access(enableIdleState) ?? false;
  const deferEndingStateProp = () => access(deferEndingState) ?? false;
  const [mounted, setMounted] = createSignal(openProp());
  const [transitionStatus, setTransitionStatus] = createSignal<TransitionStatus>(
    openProp() && enableIdleStateProp() ? 'idle' : undefined,
  );

  createEffect(() => {
    const isOpen = openProp();
    const isMounted = mounted();
    const status = transitionStatus();

    if (isOpen && !isMounted) {
      batch(() => {
        setMounted(true);
        setTransitionStatus('starting');
      });
      return;
    }

    if (!isOpen && isMounted && status !== 'ending' && !deferEndingStateProp()) {
      setTransitionStatus('ending');
      return;
    }

    if (!isOpen && !isMounted && status === 'ending') {
      setTransitionStatus(undefined);
    }
  });

  createEffect(() => {
    if (!openProp() && mounted() && transitionStatus() !== 'ending' && deferEndingStateProp()) {
      const frame = AnimationFrame.request(() => setTransitionStatus('ending'));
      onCleanup(() => AnimationFrame.cancel(frame));
    }
  });

  createEffect(() => {
    if (!openProp() || enableIdleStateProp()) {
      return;
    }

    let nextFrame: number | undefined;
    const frame = AnimationFrame.request(() => {
      nextFrame = AnimationFrame.request(() => setTransitionStatus(undefined));
    });
    onCleanup(() => {
      AnimationFrame.cancel(frame);
      if (nextFrame !== undefined) {
        AnimationFrame.cancel(nextFrame);
      }
    });
  });

  return {
    mounted,
    transitionStatus,
    setMounted,
  };
}
