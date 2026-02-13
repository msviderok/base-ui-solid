import { type JSX } from 'solid-js';
import { compareItemEquality } from '../utils/itemEquality';
import { stringifyAsValue } from '../utils/resolveValueLabel';
import type { SolidStore } from '../utils/store/SolidStore';
import type { HTMLProps } from '../utils/types';
import { type InteractionType } from '../utils/useEnhancedClickHandler';
import type { TransitionStatus } from '../utils/useTransitionStatus';

export type State = {
  id: string | undefined;
  modal: boolean;
  multiple: boolean;

  items:
    | Record<string, JSX.Element>
    | ReadonlyArray<{ label: JSX.Element; value: any }>
    | undefined;
  itemToStringLabel: ((item: any) => string) | undefined;
  itemToStringValue: ((item: any) => string) | undefined;
  isItemEqualToValue: (item: any, value: any) => boolean;

  value: any;

  open: boolean;
  mounted: boolean;
  forceMount: boolean;
  transitionStatus: TransitionStatus;
  openMethod: InteractionType | null;

  activeIndex: number | null;
  selectedIndex: number | null;

  popupProps: HTMLProps;
  triggerProps: HTMLProps;
  triggerElement: HTMLElement | null | undefined;
  positionerElement: HTMLElement | null | undefined;
  listElement: HTMLDivElement | null | undefined;

  scrollUpArrowVisible: boolean;
  scrollDownArrowVisible: boolean;

  hasScrollArrows: boolean;
};

export const selectors = {
  id: (state: State) => state.id,
  modal: (state: State) => state.modal,
  multiple: (state: State) => state.multiple,

  items: (state: State) => state.items,
  itemToStringLabel: (state: State) => state.itemToStringLabel,
  itemToStringValue: (state: State) => state.itemToStringValue,
  isItemEqualToValue: (state: State) => state.isItemEqualToValue,

  value: (state: State) => state.value,
  open: (state: State) => state.open,
  mounted: (state: State) => state.mounted,
  forceMount: (state: State) => state.forceMount,
  transitionStatus: (state: State) => state.transitionStatus,
  openMethod: (state: State) => state.openMethod,

  activeIndex: (state: State) => state.activeIndex,
  selectedIndex: (state: State) => state.selectedIndex,
  isActive: (state: State, index: number) => state.activeIndex === index,

  isSelected: (state: State, index: number, candidate: any) => {
    const comparer = state.isItemEqualToValue;
    const storeValue = state.value;

    if (state.multiple) {
      return (
        Array.isArray(storeValue) &&
        storeValue.some((item) => compareItemEquality(item, candidate, comparer))
      );
    }

    // `selectedIndex` is only updated after the items mount for the first time,
    // the value check avoids a re-render for the initially selected item.
    if (state.selectedIndex === index && state.selectedIndex !== null) {
      return true;
    }

    return compareItemEquality(storeValue, candidate, comparer);
  },
  isSelectedByFocus: (state: State, index: number) => {
    return state.selectedIndex === index;
  },

  popupProps: (state: State) => state.popupProps,
  triggerProps: (state: State) => state.triggerProps,
  triggerElement: (state: State) => state.triggerElement,
  positionerElement: (state: State) => state.positionerElement,
  listElement: (state: State) => state.listElement,

  scrollUpArrowVisible: (state: State) => state.scrollUpArrowVisible,
  scrollDownArrowVisible: (state: State) => state.scrollDownArrowVisible,

  hasScrollArrows: (state: State) => state.hasScrollArrows,

  serializedValue: (state: State) => {
    const { multiple, value, itemToStringValue } = state;
    if (multiple && Array.isArray(value) && value.length === 0) {
      return '';
    }
    return stringifyAsValue(value, itemToStringValue);
  },
};

export type SelectStore = SolidStore<State, abt, typeof selectors>;
