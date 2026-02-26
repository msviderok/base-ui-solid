import type { FocusableElement } from 'tabbable';

interface Options {
  preventScroll?: boolean | undefined;
  cancelPrevious?: boolean | undefined;
  sync?: boolean | undefined;
}

let rafId = 0;
/**
 * ––– AI-GENERATED COMMENT –––
 * Software-level cancellation for deferred focus callbacks.
 * `cancelAnimationFrame(rafId)` alone is unreliable in JSDOM where
 * `requestAnimationFrame` can return 0, making cancellation a no-op.
 * The version counter ensures stale callbacks bail out even if the
 * underlying rAF wasn't properly cancelled by the runtime.
 */
let version = 0;
export function enqueueFocus(el: FocusableElement | null, options: Options = {}) {
  const { preventScroll = false, cancelPrevious = true, sync = false } = options;
  if (cancelPrevious) {
    cancelAnimationFrame(rafId);
    version += 1;
  }
  const capturedVersion = version;
  const exec = () => {
    if (capturedVersion !== version) {
      return;
    }
    el?.focus({ preventScroll });
  };

  if (sync) {
    exec();
  } else {
    rafId = requestAnimationFrame(exec);
  }
}
