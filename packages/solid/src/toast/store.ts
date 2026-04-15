import { createMemo, mergeProps as solidMergeProps, type Accessor } from 'solid-js';
import { createStore, produce, type SetStoreFunction, type Store } from 'solid-js/store';
import { activeElement, contains, getTarget } from '../floating-ui-solid/utils';
import { access, type MaybeAccessor } from '../solid-helpers';
import { generateId } from '../utils/generateId';
import { ownerDocument } from '../utils/owner';
import { SolidStore } from '../utils/store/SolidStoreV2';
import { useTimeout } from '../utils/useTimeout';
import {
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
  ToastObject,
} from './useToastManager';
import { isFocusVisible } from './utils/focusVisible';
import { resolvePromiseOptions } from './utils/resolvePromiseOptions';

type ToastInternalUpdateOptions<Data extends object> = Partial<Omit<ToastObject<Data>, 'id'>>;

export type State = {
  toasts: ToastObject<any>[];
  hovering: boolean;
  focused: boolean;
  timeout: number;
  limit: number;
  isWindowFocused: boolean;
  viewport: HTMLElement | null | undefined;
  prevFocusElement: HTMLElement | null | undefined;
  toastMap: Map<
    string,
    { value: ToastObject<any>; domIndex: number; visibleIndex: number; offsetY: number }
  >;
};

export const selectors = {
  toasts: (state: State) => state.toasts,
  isEmpty: (state: State) => state.toasts.length === 0,
  toast: (state: State, id: Accessor<string>) => state.toastMap.get(id())?.value,
  toastIndex: (state: State, id: Accessor<string>) => state.toastMap.get(id())?.domIndex ?? -1,
  toastOffsetY: (state: State, id: Accessor<string>) => state.toastMap.get(id())?.offsetY ?? 0,
  toastVisibleIndex: (state: State, id: Accessor<string>) =>
    state.toastMap.get(id())?.visibleIndex ?? -1,
  hovering: (state: State) => state.hovering,
  focused: (state: State) => state.focused,
  expanded: (state: State) => state.hovering || state.focused,
  expandedOrOutOfFocus: (state: State) => state.hovering || state.focused || !state.isWindowFocused,
  prevFocusElement: (state: State) => state.prevFocusElement,
};

function createInitialState(initialState: Omit<State, 'toastMap'>) {
  let toastMap: Accessor<State['toastMap']>;
  const fullInitialState = Object.create(
    Object.getPrototypeOf(initialState),
    Object.getOwnPropertyDescriptors(initialState),
  );

  Object.defineProperty(fullInitialState, 'toastMap', {
    get() {
      return toastMap();
    },
  });

  const [state, setState] = createStore<State>(fullInitialState);

  // eslint-disable-next-line solid/reactivity
  toastMap = createMemo<State['toastMap']>(() => {
    const map = new Map<
      string,
      { value: ToastObject<any>; domIndex: number; visibleIndex: number; offsetY: number }
    >();
    let visibleIndex = 0;
    let offsetY = 0;
    state.toasts.forEach((toast, toastIndex) => {
      const isEnding = toast.transitionStatus === 'ending';
      map.set(toast.id, {
        value: toast,
        domIndex: toastIndex,
        visibleIndex: isEnding ? -1 : visibleIndex,
        offsetY,
      });

      offsetY += toast.height || 0;

      if (!isEnding) {
        visibleIndex += 1;
      }
    });
    return map;
  });

  return [state, setState] as [Store<State>, SetStoreFunction<State>];
}

export function ToastStore(initialState: Omit<State, 'toastMap'>) {
  const timers = new Map<string, TimerInfo>();
  const refs = new Map<string, HTMLElement | null | undefined>();
  let areTimersPaused = false;
  const [state, setState] = createInitialState(initialState);
  const store = SolidStore<State, {}, typeof selectors>([state, setState], {}, selectors);

  function setFocused(focused: boolean) {
    setState('focused', focused);
  }

  function setHovering(hovering: boolean) {
    setState('hovering', hovering);
  }

  function setIsWindowFocused(isWindowFocused: boolean) {
    setState('isWindowFocused', isWindowFocused);
  }

  function setPrevFocusElement(prevFocusElement: HTMLElement | null | undefined) {
    setState('prevFocusElement', prevFocusElement);
  }

  function setViewport(viewport: HTMLElement | null | undefined) {
    setState('viewport', viewport);
  }

  function disposeEffect() {
    return () => {
      timers.forEach((timer) => {
        timer.timeout?.clear();
      });
      timers.clear();
    };
  }

  function removeToast(toastId: Accessor<string>) {
    const index = selectors.toastIndex(state, toastId);
    if (index === -1) {
      return;
    }

    const toast = state.toasts[index];
    toast?.onRemove?.();
    refs.delete(toastId());

    setState(
      produce((s) => {
        s.toasts.splice(index, 1);
        if (s.toasts.length === 0) {
          s.hovering = false;
          s.focused = false;
        }
      }),
    );
  }

  function addToast<Data extends object>(toast: ToastManagerAddOptions<Data>): string {
    const { timeout } = state;
    const id = toast.id || generateId('toast');
    const toastToAdd: ToastObject<Data> = {
      ...toast,
      id,
      transitionStatus: 'starting',
    };

    const duration = toastToAdd.timeout ?? timeout;
    if (toastToAdd.type !== 'loading' && duration > 0) {
      scheduleTimer(id, duration, () => closeToast(() => id));
    }

    if (selectors.expandedOrOutOfFocus(state)) {
      pauseTimers();
    }

    // Insert the new toast at the beginning and update limited flags.
    // setState is called last because it triggers effects synchronously
    // (e.g. recalculateHeight) that call updateToastInternal and expect
    // the timer to already be registered.
    setState(
      produce((s) => {
        s.toasts.unshift(toastToAdd);
        const active = s.toasts.filter((t) => t.transitionStatus !== 'ending');
        if (active.length > s.limit) {
          const excessCount = active.length - s.limit;
          const limitedIds = new Set(active.slice(-excessCount).map((t) => t.id));
          for (const t of s.toasts) {
            t.limited = limitedIds.has(t.id);
          }
        } else {
          for (const t of s.toasts) {
            t.limited = false;
          }
        }
      }),
    );

    return id;
  }

  function updateToast<Data extends object>(
    id: MaybeAccessor<string>,
    updates: ToastManagerUpdateOptions<Data>,
  ) {
    updateToastInternal(id, updates);
  }

  function updateToastInternal<Data extends object>(
    id: MaybeAccessor<string>,
    updates: ToastInternalUpdateOptions<Data>,
  ) {
    const { timeout } = state;
    const prevToast = selectors.toast(state, () => access(id)) ?? null;
    if (!prevToast) {
      return;
    }

    // Ignore updates for toasts that are already closing.
    // This prevents races where async updates (e.g. promise success/error)
    // can block a dismissal from completing.
    if (prevToast.transitionStatus === 'ending') {
      return;
    }

    // Snapshot values before mutating the store, since prevToast is a store proxy.
    const prevTimeout = prevToast.timeout ?? timeout;
    const wasLoading = prevToast.type === 'loading';

    const toastId = access(id);

    // Store ref in a non-reactive side map so it doesn't trigger
    // reactive loops when consumers spread toast objects in <For>.
    if ('ref' in updates) {
      refs.set(toastId, updates.ref);
    }
    const storeUpdates = { ...updates };
    delete (storeUpdates as any).ref;

    setState('toasts', (toast) => toast.id === toastId, storeUpdates);

    const nextToast = { ...prevToast, ...updates };
    const nextTimeout = nextToast.timeout ?? timeout;
    const timeoutUpdated = Object.hasOwn(updates, 'timeout');

    const shouldHaveTimer =
      nextToast.transitionStatus !== 'ending' && nextToast.type !== 'loading' && nextTimeout > 0;

    const hasTimer = timers.has(toastId);
    const timeoutChanged = prevTimeout !== nextTimeout;

    if (!shouldHaveTimer && hasTimer) {
      const timer = timers.get(toastId);
      timer?.timeout?.clear();
      timers.delete(toastId);
      return;
    }

    // Schedule or reschedule timer if needed
    if (shouldHaveTimer && (!hasTimer || timeoutChanged || timeoutUpdated || wasLoading)) {
      const timer = timers.get(toastId);
      if (timer) {
        timer.timeout?.clear();
        timers.delete(toastId);
      }

      scheduleTimer(toastId, nextTimeout, () => closeToast(id));

      if (selectors.expandedOrOutOfFocus(state)) {
        pauseTimers();
      }
    }
  }

  function closeToast(toastId: MaybeAccessor<string>) {
    const toast = selectors.toast(state, () => access(toastId));
    toast?.onClose?.();

    const id = access(toastId);
    const timer = timers.get(id);
    if (timer && timer.timeout) {
      timer.timeout.clear();
      timers.delete(id);
    }

    handleFocusManagement(toastId);

    setState(
      produce((s) => {
        let activeIndex = 0;
        for (const item of s.toasts) {
          if (item.id === id) {
            item.transitionStatus = 'ending';
            item.height = 0;
            continue;
          }
          if (item.transitionStatus === 'ending') {
            continue;
          }
          item.limited = activeIndex >= s.limit;
          activeIndex += 1;
        }
        if (s.toasts.length === 0) {
          s.hovering = false;
          s.focused = false;
        }
      }),
    );
  }

  function promiseToast<Value, Data extends object>(
    promiseValue: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>,
  ): Promise<Value> {
    // Create a loading toast (which does not auto-dismiss).
    const loadingOptions = resolvePromiseOptions(options.loading);
    const id = addToast({
      ...loadingOptions,
      type: 'loading',
    });

    const handledPromise = promiseValue
      .then((result: Value) => {
        const successOptions = resolvePromiseOptions(options.success, result);
        updateToast(() => id, {
          ...successOptions,
          type: 'success',
          timeout: successOptions.timeout,
        });

        return result;
      })
      .catch((error) => {
        const errorOptions = resolvePromiseOptions(options.error, error);
        updateToast(() => id, {
          ...errorOptions,
          type: 'error',
          timeout: errorOptions.timeout,
        });

        return Promise.reject(error);
      });

    // Private API used exclusively by `Manager` to handoff the promise
    // back to the manager after it's handled here.
    if ({}.hasOwnProperty.call(options, 'setPromise')) {
      (options as any).setPromise(handledPromise);
    }

    return handledPromise;
  }

  function pauseTimers() {
    if (areTimersPaused) {
      return;
    }
    areTimersPaused = true;
    timers.forEach((timer) => {
      if (timer.timeout) {
        timer.timeout.clear();
        const elapsed = Date.now() - timer.start;
        const remaining = timer.delay - elapsed;
        timer.remaining = remaining > 0 ? remaining : 0;
      }
    });
  }

  function resumeTimers() {
    if (!areTimersPaused) {
      return;
    }
    areTimersPaused = false;
    timers.forEach((timer, id) => {
      timer.remaining = timer.remaining > 0 ? timer.remaining : timer.delay;
      timer.timeout ??= useTimeout();
      timer.timeout.start(timer.remaining, () => {
        timers.delete(id);
        timer.callback();
      });
      timer.start = Date.now();
    });
  }

  function restoreFocusToPrevElement() {
    state.prevFocusElement?.focus({ preventScroll: true });
  }

  function handleDocumentPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return;
    }

    const target = getTarget(event) as Element | null;
    if (contains(state.viewport, target)) {
      return;
    }

    resumeTimers();
    store.update({ hovering: false, focused: false });
  }

  function scheduleTimer(id: string, delay: number, callback: () => void) {
    const start = Date.now();
    const shouldStartActive = !selectors.expandedOrOutOfFocus(state);
    const currentTimeout = shouldStartActive ? useTimeout() : undefined;

    currentTimeout?.start(delay, () => {
      timers.delete(id);
      callback();
    });

    timers.set(id, {
      timeout: currentTimeout,
      start: shouldStartActive ? start : 0,
      delay,
      remaining: delay,
      callback,
    });
  }

  function handleFocusManagement(toastId: MaybeAccessor<string>) {
    const activeEl = activeElement(ownerDocument(state.viewport ?? null));
    if (!state.viewport || !contains(state.viewport, activeEl) || !isFocusVisible(activeEl)) {
      return;
    }

    const toasts = selectors.toasts(state);
    const currentIndex = selectors.toastIndex(state, () => access(toastId));
    let nextToast: ToastObject<any> | null = null;

    // Try to find the next toast that isn't animating out
    let index = currentIndex + 1;
    while (index < toasts.length) {
      if (toasts[index].transitionStatus !== 'ending') {
        nextToast = toasts[index];
        break;
      }
      index += 1;
    }

    // Go backwards if no next toast is found
    if (!nextToast) {
      index = currentIndex - 1;
      while (index >= 0) {
        if (toasts[index].transitionStatus !== 'ending') {
          nextToast = toasts[index];
          break;
        }
        index -= 1;
      }
    }

    if (nextToast) {
      refs.get(nextToast.id)?.focus();
    } else {
      restoreFocusToPrevElement();
    }
  }

  function getToastRef(id: string) {
    return refs.get(id);
  }

  const merged = solidMergeProps(store, {
    setFocused,
    setHovering,
    setIsWindowFocused,
    setPrevFocusElement,
    setViewport,
    disposeEffect,
    removeToast,
    addToast,
    updateToast,
    updateToastInternal,
    closeToast,
    promiseToast,
    pauseTimers,
    resumeTimers,
    restoreFocusToPrevElement,
    handleDocumentPointerDown,
    getToastRef,
  });
  return merged;
}

interface TimerInfo {
  timeout?: ReturnType<typeof useTimeout> | undefined;
  start: number;
  delay: number;
  remaining: number;
  callback: () => void;
}

export type ToastStore = ReturnType<typeof ToastStore>;
