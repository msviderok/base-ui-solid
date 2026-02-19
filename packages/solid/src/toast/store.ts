import { generateId } from '@base-ui/utils/generateId';
import { ownerDocument } from '@base-ui/utils/owner';
import { createMemo, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { activeElement, contains, getTarget } from '../floating-ui-solid/utils';
import { access, type MaybeAccessor } from '../solid-helpers';
import { SolidStore } from '../utils/store/SolidStore';
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

export class ToastStore extends SolidStore<State, {}, typeof selectors> {
  private timers = new Map<string, TimerInfo>();

  private areTimersPaused = false;

  constructor(initialState: State) {
    super(createInitialState(initialState), {}, selectors);
  }

  setFocused(focused: boolean) {
    this.set('focused', focused);
  }

  setHovering(hovering: boolean) {
    this.set('hovering', hovering);
  }

  setIsWindowFocused(isWindowFocused: boolean) {
    this.set('isWindowFocused', isWindowFocused);
  }

  setPrevFocusElement(prevFocusElement: HTMLElement | null) {
    this.set('prevFocusElement', prevFocusElement);
  }

  setViewport = (viewport: HTMLElement | null) => {
    this.set('viewport', viewport);
  };

  disposeEffect = () => {
    return () => {
      this.timers.forEach((timer) => {
        timer.timeout?.clear();
      });
      this.timers.clear();
    };
  };

  removeToast(toastId: Accessor<string>) {
    const index = selectors.toastIndex(this.state, toastId);
    if (index === -1) {
      return;
    }

    const toast = this.state.toasts[index];
    toast?.onRemove?.();

    const newToasts = [...this.state.toasts];
    newToasts.splice(index, 1);
    this.setToasts(newToasts);
  }

  addToast = <Data extends object>(toast: ToastManagerAddOptions<Data>): string => {
    const { toasts, timeout, limit } = this.state;
    const id = toast.id || generateId('toast');
    const toastToAdd: ToastObject<Data> = {
      ...toast,
      id,
      transitionStatus: 'starting',
    };

    const updatedToasts = [toastToAdd, ...toasts];
    const activeToasts = updatedToasts.filter((t) => t.transitionStatus !== 'ending');

    // Mark oldest toasts for removal when over limit
    if (activeToasts.length > limit) {
      const excessCount = activeToasts.length - limit;
      const oldestActiveToasts = activeToasts.slice(-excessCount);
      const limitedIds = new Set(oldestActiveToasts.map((t) => t.id));

      this.setToasts(
        updatedToasts.map((t) => {
          const limited = limitedIds.has(t.id);
          if (t.limited !== limited) {
            return { ...t, limited };
          }
          return t;
        }),
      );
    } else {
      this.setToasts(updatedToasts.map((t) => (t.limited ? { ...t, limited: false } : t)));
    }

    const duration = toastToAdd.timeout ?? timeout;
    if (toastToAdd.type !== 'loading' && duration > 0) {
      this.scheduleTimer(id, duration, () => this.closeToast(() => id));
    }

    if (selectors.expandedOrOutOfFocus(this.state)) {
      this.pauseTimers();
    }

    return id;
  };

  updateToast = <Data extends object>(
    id: MaybeAccessor<string>,
    updates: ToastManagerUpdateOptions<Data>,
  ) => {
    this.updateToastInternal(id, updates);
  };

  updateToastInternal = <Data extends object>(
    id: MaybeAccessor<string>,
    updates: ToastInternalUpdateOptions<Data>,
  ) => {
    const { timeout, toasts } = this.state;
    const prevToast = selectors.toast(this.state, () => access(id)) ?? null;
    if (!prevToast) {
      return;
    }

    // Ignore updates for toasts that are already closing.
    // This prevents races where async updates (e.g. promise success/error)
    // can block a dismissal from completing.
    if (prevToast.transitionStatus === 'ending') {
      return;
    }

    const nextToast = { ...prevToast, ...updates };

    this.setToasts(
      toasts.map((toast) => (toast.id === access(id) ? { ...toast, ...updates } : toast)),
    );

    const nextTimeout = nextToast.timeout ?? timeout;
    const prevTimeout = prevToast?.timeout ?? timeout;

    const timeoutUpdated = Object.hasOwn(updates, 'timeout');

    const shouldHaveTimer =
      nextToast.transitionStatus !== 'ending' && nextToast.type !== 'loading' && nextTimeout > 0;

    const hasTimer = this.timers.has(access(id));
    const timeoutChanged = prevTimeout !== nextTimeout;
    const wasLoading = prevToast?.type === 'loading';

    if (!shouldHaveTimer && hasTimer) {
      const timer = this.timers.get(access(id));
      timer?.timeout?.clear();
      this.timers.delete(access(id));
      return;
    }

    // Schedule or reschedule timer if needed
    if (shouldHaveTimer && (!hasTimer || timeoutChanged || timeoutUpdated || wasLoading)) {
      const timer = this.timers.get(access(id));
      if (timer) {
        timer.timeout?.clear();
        this.timers.delete(access(id));
      }

      this.scheduleTimer(access(id), nextTimeout, () => this.closeToast(id));

      if (selectors.expandedOrOutOfFocus(this.state)) {
        this.pauseTimers();
      }
    }
  };

  closeToast = (toastId: MaybeAccessor<string>) => {
    const toast = selectors.toast(this.state, () => access(toastId));
    toast?.onClose?.();

    const { limit, toasts } = this.state;

    let activeIndex = 0;
    const newToasts = toasts.map((item) => {
      if (item.id === access(toastId)) {
        return { ...item, transitionStatus: 'ending' as const, height: 0 };
      }
      if (item.transitionStatus === 'ending') {
        return item;
      }
      const isLimited = activeIndex >= limit;
      activeIndex += 1;
      return item.limited !== isLimited ? { ...item, limited: isLimited } : item;
    });

    const timer = this.timers.get(access(toastId));
    if (timer && timer.timeout) {
      timer.timeout.clear();
      this.timers.delete(access(toastId));
    }

    this.handleFocusManagement(toastId);
    this.setToasts(newToasts);
  };

  promiseToast = <Value, Data extends object>(
    promiseValue: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>,
  ): Promise<Value> => {
    // Create a loading toast (which does not auto-dismiss).
    const loadingOptions = resolvePromiseOptions(options.loading);
    const id = this.addToast({
      ...loadingOptions,
      type: 'loading',
    });

    const handledPromise = promiseValue
      .then((result: Value) => {
        const successOptions = resolvePromiseOptions(options.success, result);
        this.updateToast(() => id, {
          ...successOptions,
          type: 'success',
          timeout: successOptions.timeout,
        });

        return result;
      })
      .catch((error) => {
        const errorOptions = resolvePromiseOptions(options.error, error);
        this.updateToast(() => id, {
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
  };

  pauseTimers() {
    if (this.areTimersPaused) {
      return;
    }
    this.areTimersPaused = true;
    this.timers.forEach((timer) => {
      if (timer.timeout) {
        timer.timeout.clear();
        const elapsed = Date.now() - timer.start;
        const remaining = timer.delay - elapsed;
        timer.remaining = remaining > 0 ? remaining : 0;
      }
    });
  }

  resumeTimers() {
    if (!this.areTimersPaused) {
      return;
    }
    this.areTimersPaused = false;
    this.timers.forEach((timer, id) => {
      timer.remaining = timer.remaining > 0 ? timer.remaining : timer.delay;
      timer.timeout ??= useTimeout();
      timer.timeout.start(timer.remaining, () => {
        this.timers.delete(id);
        timer.callback();
      });
      timer.start = Date.now();
    });
  }

  restoreFocusToPrevElement() {
    this.state.prevFocusElement?.focus({ preventScroll: true });
  }

  handleDocumentPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }

    const target = getTarget(event) as Element | null;
    if (contains(this.state.viewport, target)) {
      return;
    }

    this.resumeTimers();
    this.update({ hovering: false, focused: false });
  };

  private scheduleTimer(id: string, delay: number, callback: () => void) {
    const start = Date.now();
    const shouldStartActive = !selectors.expandedOrOutOfFocus(this.state);
    const currentTimeout = shouldStartActive ? useTimeout() : undefined;

    currentTimeout?.start(delay, () => {
      this.timers.delete(id);
      callback();
    });

    this.timers.set(id, {
      timeout: currentTimeout,
      start: shouldStartActive ? start : 0,
      delay,
      remaining: delay,
      callback,
    });
  }

  private setToasts(newToasts: ToastObject<any>[]) {
    const updates: Partial<State> = { toasts: newToasts };
    if (newToasts.length === 0) {
      updates.hovering = false;
      updates.focused = false;
    }
    this.update(updates);
  }

  private handleFocusManagement(toastId: MaybeAccessor<string>) {
    const activeEl = activeElement(ownerDocument(this.state.viewport ?? null));
    if (
      !this.state.viewport ||
      !contains(this.state.viewport, activeEl) ||
      !isFocusVisible(activeEl)
    ) {
      return;
    }

    const toasts = selectors.toasts(this.state);
    const currentIndex = selectors.toastIndex(this.state, () => access(toastId));
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
      nextToast.ref?.focus();
    } else {
      this.restoreFocusToPrevElement();
    }
  }
}

interface TimerInfo {
  timeout?: ReturnType<typeof useTimeout> | undefined;
  start: number;
  delay: number;
  remaining: number;
  callback: () => void;
}

function createInitialState(initialState: State) {
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
