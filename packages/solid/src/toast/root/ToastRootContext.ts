import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { ToastObject } from '../useToastManager';

export interface ToastRootContext {
  toast: Accessor<ToastObject<any>>;
  refs: {
    rootRef: HTMLElement | null | undefined;
  };
  titleId: Accessor<string | undefined>;
  setTitleId: Setter<string | undefined>;
  descriptionId: Accessor<string | undefined>;
  setDescriptionId: Setter<string | undefined>;
  swipeDirection: Accessor<'up' | 'down' | 'left' | 'right' | undefined>;
  swiping: Accessor<boolean>;
  index: Accessor<number>;
  visibleIndex: Accessor<number>;
  expanded: Accessor<boolean>;
  recalculateHeight: (flushSync?: boolean) => void;
}

export const ToastRootContext = createContext<ToastRootContext | undefined>(undefined);

export function useToastRootContext(): ToastRootContext {
  const context = useContext(ToastRootContext);
  if (!context) {
    throw new Error(
      'Base UI: ToastRootContext is missing. Toast parts must be used within <Toast.Root>.',
    );
  }
  return context;
}
