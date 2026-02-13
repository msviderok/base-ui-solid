import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import type {
  ToastManagerAddOptions,
  ToastManagerPromiseOptions,
  ToastManagerUpdateOptions,
  ToastObject,
} from '../useToastManager';

export interface ToastContextValue<Data extends object> {
  toasts: Store<{ list: ToastObject<any>[] }>;
  setToasts: SetStoreFunction<{ list: ToastObject<any>[] }>;
  hovering: Accessor<boolean>;
  setHovering: Setter<boolean>;
  focused: Accessor<boolean>;
  setFocused: Setter<boolean>;
  expanded: Accessor<boolean>;
  add: (options: ToastManagerAddOptions<Data>) => string;
  update: (id: string, options: ToastManagerUpdateOptions<Data>) => void;
  promise: <Value>(
    value: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>,
  ) => Promise<Value>;
  close: (id: string) => void;
  pauseTimers: () => void;
  resumeTimers: () => void;
  remove: (id: string) => void;
  refs: {
    viewportRef: HTMLElement | null | undefined;
    windowFocusedRef: boolean;
  };
  prevFocusElement: Accessor<HTMLElement | null | undefined>;
  setPrevFocusElement: Setter<HTMLElement | null | undefined>;
  scheduleTimer: (id: string, delay: number, callback: () => void) => void;
}

export type ToastContext<Data extends object> = ToastContextValue<Data>;

export const ToastContext = createContext<ToastContext<any> | undefined>(undefined);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('Base UI: useToastManager must be used within <Toast.Provider>.');
  }
  return context;
}
