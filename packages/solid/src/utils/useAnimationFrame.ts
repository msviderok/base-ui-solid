import { AnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { onCleanup } from 'solid-js';

/**
 * A `requestAnimationFrame` with automatic cleanup and guard.
 */
export function useAnimationFrame() {
  const timeout = AnimationFrame.create();

  onCleanup(() => {
    timeout.disposeEffect();
  });

  return timeout;
}
