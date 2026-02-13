import { createContext, useContext, type Accessor } from 'solid-js';
import type { SetStoreFunction, Store } from 'solid-js/store';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import { type FloatingEvents, type FloatingRootContext } from '../../floating-ui-solid';
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
  refs: {
    listRef: Array<HTMLElement | null | undefined>;
    popupRef: HTMLDivElement | null | undefined;
    scrollHandlerRef: ((el: HTMLDivElement) => void) | null;
    scrollArrowsMountedCountRef: number;
    valueRef: HTMLSpanElement | null | undefined;
    valuesRef: Array<any>;
    labelsRef: Array<string | null>;
    typingRef: boolean;
    selectionRef: {
      allowUnselectedMouseUp: boolean;
      allowSelectedMouseUp: boolean;
    };
    selectedItemTextRef: HTMLSpanElement | null | undefined;
    keyboardActiveRef: boolean;
    alignItemWithTriggerActiveRef: boolean;
    initialValueRef: any;
  };
  handleScrollArrowVisibility: () => void;
  getItemProps: (
    props?: HTMLProps & { active?: boolean; selected?: boolean },
  ) => Record<string, unknown>; // PREVENT_COMMIT
  events: FloatingEvents;
  validation: UseFieldValidationReturnValue;
  onOpenChangeComplete?: (open: boolean) => void;
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
