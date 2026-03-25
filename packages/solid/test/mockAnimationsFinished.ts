export interface MockAnimationsFinishedResult {
  finish: () => void;
}

/**
 * Headless Chromium can miss very short real CSS exit animations when a whole test file runs,
 * which makes `getAnimations()` report no active animations and causes unmount assertions to
 * race. This helper replaces the element's animation list with one controlled animation so tests
 * can first assert `data-ending-style`, then explicitly resolve the animation and verify unmount.
 */
export function mockAnimationsFinished(element: HTMLElement): MockAnimationsFinishedResult {
  let resolveAnimationFinished: (() => void) | undefined;
  const animationFinished = new Promise<void>((resolve) => {
    resolveAnimationFinished = resolve;
  });

  const fakeAnimation = {
    finished: animationFinished,
    pending: false,
    playState: 'running',
  } as unknown as Animation;

  Object.defineProperty(element, 'getAnimations', {
    configurable: true,
    value: () => [fakeAnimation],
  });

  return {
    finish() {
      resolveAnimationFinished?.();
    },
  };
}
