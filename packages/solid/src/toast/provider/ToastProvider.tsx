import { createEffect, onCleanup, type JSX } from 'solid-js';
import type { ToastManager, ToastManagerEvent } from '../createToastManager';
import { ToastStore } from '../store';
import { ToastContext } from './ToastProviderContext';

/**
 * Provides a context for creating and managing toasts.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastProvider(props: ToastProvider.Props) {
  const timeout = () => props.timeout ?? 5000;
  const limit = () => props.limit ?? 3;

  const store = new ToastStore({
    get timeout() {
      return timeout();
    },
    get limit() {
      return limit();
    },
    viewport: null,
    toasts: [],
    hovering: false,
    focused: false,
    isWindowFocused: true,
    prevFocusElement: null,
  });

  onCleanup(() => {
    store.disposeEffect();
  });

  const onUnsubscribe = ({ action, options }: ToastManagerEvent) => {
    const id = options.id;

    if (action === 'promise' && options.promise) {
      store.promiseToast(options.promise, options);
    } else if (action === 'update' && id) {
      store.updateToast(() => id, options);
    } else if (action === 'close' && id) {
      store.closeToast(() => id);
    } else {
      store.addToast(options);
    }
  };

  store.useSyncedValues({ timeout, limit });

  createEffect(function subscribeToToastManager() {
    if (!props.toastManager) {
      return;
    }

    const unsubscribe = props.toastManager[' subscribe'](onUnsubscribe);
    onCleanup(unsubscribe);
  });

  return <ToastContext.Provider value={store}>{props.children}</ToastContext.Provider>;
}

export interface ToastProviderProps {
  children?: JSX.Element;
  /**
   * The default amount of time (in ms) before a toast is auto dismissed.
   * A value of `0` will prevent the toast from being dismissed automatically.
   * @default 5000
   */
  timeout?: number | undefined;
  /**
   * The maximum number of toasts that can be displayed at once.
   * When the limit is reached, the oldest toast will be removed to make room for the new one.
   * @default 3
   */
  limit?: number | undefined;
  /**
   * A global manager for toasts to use outside of a React component.
   */
  toastManager?: ToastManager | undefined;
}

export namespace ToastProvider {
  export type Props = ToastProviderProps;
}
