import { generateId } from '@base-ui/utils/generateId';
import { ownerDocument } from '@base-ui/utils/owner';
import { batch, createEffect, createSignal, onCleanup, type JSX } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { activeElement, contains } from '../../floating-ui-solid/utils';
import { useTimeout, type Timeout } from '../../utils/useTimeout';
import type { ToastManager, ToastManagerEvent } from '../createToastManager';
import type {
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
  ToastObject,
} from '../useToastManager';
import { isFocusVisible } from '../utils/focusVisible';
import { resolvePromiseOptions } from '../utils/resolvePromiseOptions';
import { ToastContext } from './ToastProviderContext';

interface TimerInfo {
  timeout?: Timeout;
  start: number;
  delay: number;
  remaining: number;
  callback: () => void;
}

/**
 * Provides a context for creating and managing toasts.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastProvider(props: ToastProvider.Props) {
  const timeout = () => props.timeout ?? 5000;
  const limit = () => props.limit ?? 3;

  const [toasts, setToasts] = createStore<ToastContext<any>['toasts']>({ list: [] });
  const [hovering, setHovering] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [prevFocusElement, setPrevFocusElement] = createSignal<HTMLElement | null | undefined>(
    null,
  );

  createEffect(() => {
    if (toasts.list.length === 0) {
      batch(() => {
        if (hovering()) {
          setHovering(false);
        }

        if (focused()) {
          setFocused(false);
        }
      });
    }
  });

  const expanded = () => hovering() || focused();

  const timersRef = new Map<string, TimerInfo>();
  const refs: ToastContext<any>['refs'] = {
    viewportRef: null,
    windowFocusedRef: true,
  };
  let isPausedRef = false;

  function handleFocusManagement(toastId: string) {
    const activeEl = activeElement(ownerDocument(refs.viewportRef ?? null));
    if (!refs.viewportRef || !contains(refs.viewportRef, activeEl) || !isFocusVisible(activeEl)) {
      return;
    }

    const currentIndex = toasts.list.findIndex((toast) => toast.id === toastId);
    let nextToast: ToastObject<any> | null = null;

    // Try to find the next toast that isn't animating out
    let index = currentIndex + 1;
    while (index < toasts.list.length) {
      if (toasts.list[index].transitionStatus !== 'ending') {
        nextToast = toasts.list[index];
        break;
      }
      index += 1;
    }

    // Go backwards if no next toast is found
    if (!nextToast) {
      index = currentIndex - 1;
      while (index >= 0) {
        if (toasts.list[index].transitionStatus !== 'ending') {
          nextToast = toasts.list[index];
          break;
        }
        index -= 1;
      }
    }

    if (nextToast) {
      nextToast.ref?.focus();
    } else {
      prevFocusElement()?.focus({ preventScroll: true });
    }
  }

  const pauseTimers = () => {
    if (isPausedRef) {
      return;
    }
    isPausedRef = true;
    timersRef.forEach((timer) => {
      if (timer.timeout) {
        timer.timeout.clear();
        const elapsed = Date.now() - timer.start;
        const remaining = timer.delay - elapsed;
        timer.remaining = remaining > 0 ? remaining : 0;
      }
    });
  };

  const resumeTimers = () => {
    if (!isPausedRef) {
      return;
    }
    isPausedRef = false;
    timersRef.forEach((timer, id) => {
      timer.remaining = timer.remaining > 0 ? timer.remaining : timer.delay;
      timer.timeout ??= useTimeout();
      timer.timeout.start(timer.remaining, () => {
        timersRef.delete(id);
        timer.callback();
      });
      timer.start = Date.now();
    });
  };

  const close = (toastId: string) => {
    batch(() => {
      setToasts(
        'list',
        produce((prevToasts) => {
          for (const toast of prevToasts) {
            if (toast.id === toastId) {
              toast.transitionStatus = 'ending';
              toast.height = 0;
            }
          }

          const activeToasts = prevToasts.filter((t) => t.transitionStatus !== 'ending');

          for (const toast of prevToasts) {
            if (toast.transitionStatus === 'ending') {
              continue;
            }
            const isActiveToastLimited = activeToasts.indexOf(toast) >= limit();
            toast.limited = isActiveToastLimited;
          }
        }),
      );

      const timer = timersRef.get(toastId);
      if (timer && timer.timeout) {
        timer.timeout.clear();
        timersRef.delete(toastId);
      }

      const toast = toasts.list.find((t) => t.id === toastId);
      toast?.onClose?.();

      handleFocusManagement(toastId);

      if (toasts.list.length === 1) {
        setHovering(false);
        setFocused(false);
      }
    });
  };

  const remove = (toastId: string) => {
    let onRemoveCallback: (() => void) | undefined;
    setToasts('list', (prev) =>
      prev.filter((toast) => {
        if (toast.id === toastId) {
          onRemoveCallback = toast.onRemove;
        }
        return toast.id !== toastId;
      }),
    );
    onRemoveCallback?.();
  };

  const scheduleTimer = (id: string, delay: number, callback: () => void) => {
    const start = Date.now();

    const shouldStartActive = refs.windowFocusedRef && !hovering() && !focused();

    const currentTimeout = shouldStartActive ? useTimeout() : undefined;

    currentTimeout?.start(delay, () => {
      timersRef.delete(id);
      callback();
    });

    timersRef.set(id, {
      timeout: currentTimeout,
      start: shouldStartActive ? start : 0,
      delay,
      remaining: delay,
      callback,
    });
  };

  const add = <Data extends object>(toast: ToastManagerAddOptions<Data>): string => {
    const id = toast.id || generateId('toast');
    const toastToAdd: ToastObject<Data> = {
      ...toast,
      id,
      transitionStatus: 'starting',
    };
    setToasts(
      'list',
      produce((prev) => {
        prev.unshift(toastToAdd);
        const activeToasts = prev.filter((t) => t.transitionStatus !== 'ending');

        // Mark oldest toasts for removal when over limit
        if (activeToasts.length > limit()) {
          const excessCount = activeToasts.length - limit();
          const oldestActiveToasts = activeToasts.slice(-excessCount);

          for (const t of prev) {
            t.limited = oldestActiveToasts.some((old) => old.id === t.id);
          }

          return;
        }

        for (const t of prev) {
          t.limited = false;
        }
      }),
    );

    const duration = toastToAdd.timeout ?? timeout();
    if (toastToAdd.type !== 'loading' && duration > 0) {
      const cb = () => close(id);
      scheduleTimer(id, duration, cb);
    }

    if (hovering() || focused() || !refs.windowFocusedRef) {
      pauseTimers();
    }
    return id;
  };

  const update = <Data extends object, K extends keyof ToastObject<Data>>(
    id: string,
    updates: ToastManagerUpdateOptions<Data>,
  ) => {
    setToasts(
      'list',
      (item) => item.id === id,
      produce((toast) => {
        // eslint-disable-next-line guard-for-in
        for (const key in updates) {
          toast[key as K] = (updates as any)[key];
        }
      }),
    );
  };

  const promise = <Value, Data extends object>(
    promiseValue: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>,
  ): Promise<Value> => {
    // Create a loading toast (which does not auto-dismiss).
    const loadingOptions = resolvePromiseOptions(options.loading);
    const id = add({
      ...loadingOptions,
      type: 'loading',
    });

    const cb = () => close(id);

    const onSuccess = (result: Value) => {
      batch(() => {
        const successOptions = resolvePromiseOptions(options.success, result);
        update(id, {
          ...successOptions,
          type: 'success',
        });

        const successTimeout = successOptions.timeout ?? timeout();
        if (successTimeout > 0) {
          scheduleTimer(id, successTimeout, cb);
        }

        if (hovering() || focused() || !refs.windowFocusedRef) {
          pauseTimers();
        }
      });
      return result;
    };
    const onError = (error: any) => {
      batch(() => {
        const errorOptions = resolvePromiseOptions(options.error, error);
        update(id, {
          ...errorOptions,
          type: 'error',
        });

        const errorTimeout = errorOptions.timeout ?? timeout();
        if (errorTimeout > 0) {
          scheduleTimer(id, errorTimeout, cb);
        }

        if (hovering() || focused() || !refs.windowFocusedRef) {
          pauseTimers();
        }
      });
      return Promise.reject(error);
    };

    const handledPromise = promiseValue.then(onSuccess).catch(onError);

    // Private API used exclusively by `Manager` to handoff the promise
    // back to the manager after it's handled here.
    if ({}.hasOwnProperty.call(options, 'setPromise')) {
      (options as any).setPromise(handledPromise);
    }

    return handledPromise;
  };

  const onUnsubscribe = ({ action, options }: ToastManagerEvent) => {
    const id = options.id;

    if (action === 'promise' && options.promise) {
      promise(options.promise, options);
    } else if (action === 'update' && id) {
      update(id, options);
    } else if (action === 'close' && id) {
      close(id);
    } else {
      add(options);
    }
  };

  createEffect(function subscribeToToastManager() {
    if (!props.toastManager) {
      return;
    }

    const unsubscribe = props.toastManager[' subscribe'](onUnsubscribe);
    onCleanup(unsubscribe);
  });

  const contextValue: ToastContext<any> = {
    toasts,
    setToasts,
    hovering,
    setHovering,
    focused,
    setFocused,
    expanded,
    add,
    close,
    remove,
    update,
    promise,
    pauseTimers,
    resumeTimers,
    prevFocusElement,
    setPrevFocusElement,
    scheduleTimer,
    refs,
  };

  return <ToastContext.Provider value={contextValue}>{props.children}</ToastContext.Provider>;
}

export interface ToastProviderProps {
  children?: JSX.Element;
  /**
   * The default amount of time (in ms) before a toast is auto dismissed.
   * A value of `0` will prevent the toast from being dismissed automatically.
   * @default 5000
   */
  timeout?: number;
  /**
   * The maximum number of toasts that can be displayed at once.
   * When the limit is reached, the oldest toast will be removed to make room for the new one.
   * @default 3
   */
  limit?: number;
  /**
   * A global manager for toasts to use outside of a React component.
   */
  toastManager?: ToastManager;
}

export namespace ToastProvider {
  export type Props = ToastProviderProps;
}
