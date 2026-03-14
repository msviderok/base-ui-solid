import { getOwner, onCleanup, runWithOwner } from 'solid-js';

type TimeoutId = number;
export type Timeout = ReturnType<typeof useTimeout>;

const EMPTY = 0 as TimeoutId;

/**
 * A `setTimeout` with automatic cleanup and guard.
 */
export function useTimeout() {
  let currentId: TimeoutId = EMPTY;
  const owner = getOwner();

  function start(delay: number, fn: Function) {
    clear();
    currentId = setTimeout(() => {
      currentId = EMPTY;
      fn();
    }, delay) as unknown as TimeoutId;
  }

  function clear() {
    if (currentId !== EMPTY) {
      clearTimeout(currentId as TimeoutId);
      currentId = EMPTY;
    }
  }

  function isStarted() {
    return currentId !== EMPTY;
  }

  if (owner) {
    runWithOwner(owner, () => {
      onCleanup(() => clear());
    });
  }

  return { start, clear, isStarted };
}
