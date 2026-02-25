import { createContext, useContext, type Accessor } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import { type FloatingEvents, type FloatingRootContext } from '../../floating-ui-solid';
import type { ReactLikeRef } from '../../solid-helpers';
import type { HTMLProps } from '../../utils/types';
import type { SelectStore } from '../store';
import type { SelectRoot } from './SelectRoot';

export interface SelectRootContext {
  store: Store<SelectStore>;
  setStore: SetStoreFunction<SelectStore>;
  selectors: {
    isActive: (index: number) => boolean;
    isSelected: (data: [index: number, value: any]) => boolean;
  };
  name: Accessor<string | undefined>;
  disabled: Accessor<boolean>;
  readOnly: Accessor<boolean>;
  required: Accessor<boolean>;
  multiple: Accessor<boolean>;
  highlightItemOnHover: Accessor<boolean>;
  setValue: (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => void;
  setOpen: (open: boolean, eventDetails: SelectRoot.ChangeEventDetails) => void;
  listRef: ReactLikeRef<Array<HTMLElement | null | undefined>>;
  popupRef: ReactLikeRef<HTMLDivElement | null | undefined>;
  scrollHandlerRef: ReactLikeRef<((el: HTMLDivElement) => void) | null>;
  handleScrollArrowVisibility: () => void;
  scrollArrowsMountedCountRef: ReactLikeRef<number>;
  getItemProps: (
    props?: HTMLProps & { active?: boolean | undefined; selected?: boolean | undefined },
  ) => Record<string, unknown>; // PREVENT_COMMIT
  events: FloatingEvents;
  valueRef: ReactLikeRef<HTMLSpanElement | null | undefined>;
  valuesRef: ReactLikeRef<Array<any>>;
  labelsRef: ReactLikeRef<Array<string | null>>;
  typingRef: ReactLikeRef<boolean>;
  selectionRef: ReactLikeRef<{
    allowUnselectedMouseUp: boolean;
    allowSelectedMouseUp: boolean;
  }>;
  selectedItemTextRef: ReactLikeRef<HTMLSpanElement | null | undefined>;
  validation: UseFieldValidationReturnValue;
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  keyboardActiveRef: ReactLikeRef<boolean>;
  alignItemWithTriggerActiveRef: ReactLikeRef<boolean>;
  initialValueRef: ReactLikeRef<any>;
}

export const SelectRootContext = createContext<SelectRootContext | null>(null);
export const SelectFloatingContext = createContext<FloatingRootContext | null>(null);

export function useSelectRootContext() {
  const context = useContext(SelectRootContext);
  if (context === null) {
    throw new Error(
      'Base UI: SelectRootContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return context;
}

export function useSelectFloatingContext() {
  const context = useContext(SelectFloatingContext);
  if (context === null) {
    throw new Error(
      'Base UI: SelectFloatingContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return context;
}
