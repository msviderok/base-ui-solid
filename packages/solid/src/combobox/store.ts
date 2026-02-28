import type { Accessor } from 'solid-js';
import { compareItemEquality } from '../utils/itemEquality';
import { hasNullItemLabel } from '../utils/resolveValueLabel';
import { SolidStore } from '../utils/store/SolidStoreV2';
import type { HTMLProps } from '../utils/types';
import type { Side } from '../utils/useAnchorPositioning';
import type { InteractionType } from '../utils/useEnhancedClickHandler';
import type { TransitionStatus } from '../utils/useTransitionStatus';
import type { AriaCombobox } from './root/AriaCombobox';

export type State = {
  id: string | undefined;

  query: string;

  filter: (item: any, query: string) => boolean;

  items: readonly any[] | undefined;

  selectedValue: any;

  open: boolean;
  mounted: boolean;
  transitionStatus: TransitionStatus;
  forceMounted: boolean;

  inline: boolean;

  activeIndex: number | null;
  selectedIndex: number | null;

  popupProps: HTMLProps;
  inputProps: HTMLProps;
  triggerProps: HTMLProps;

  positionerElement: HTMLElement | null | undefined;
  listElement: HTMLElement | null | undefined;
  triggerElement: HTMLElement | null | undefined;
  inputElement: HTMLInputElement | null | undefined;
  popupSide: Side | null;

  openMethod: InteractionType | null;

  inputInsidePopup: boolean;

  selectionMode: 'single' | 'multiple' | 'none';

  listRef: Array<HTMLElement | null | undefined>;
  labelsRef: Array<string | null>;
  popupRef: HTMLDivElement | null | undefined;
  emptyRef: HTMLDivElement | null | undefined;
  inputRef: HTMLInputElement | null | undefined;
  keyboardActiveRef: boolean;
  chipsContainerRef: HTMLDivElement | null | undefined;
  clearRef: HTMLButtonElement | null | undefined;
  valuesRef: Array<any>;
  allValuesRef: Array<any>;
  selectionEventRef: MouseEvent | PointerEvent | KeyboardEvent | null;

  setOpen: (open: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setInputValue: (value: string, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setSelectedValue: (value: any, eventDetails: AriaCombobox.ChangeEventDetails) => void;
  setIndices: (indices: {
    activeIndex?: (number | null) | undefined;
    selectedIndex?: (number | null) | undefined;
    type?: ('keyboard' | 'pointer' | 'none') | undefined;
  }) => void;
  onItemHighlighted: (item: any, eventDetails: AriaCombobox.HighlightEventDetails) => void;
  forceMount: () => void;
  handleSelection: (event: MouseEvent | PointerEvent | KeyboardEvent, passedValue?: any) => void;
  getItemProps: (
    props?: HTMLProps & { active?: boolean | undefined; selected?: boolean | undefined },
  ) => Record<string, unknown>;
  requestSubmit: () => void;

  name: string | undefined;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  grid: boolean;
  isGrouped: boolean;
  virtualized: boolean;
  onOpenChangeComplete: (open: boolean) => void;
  openOnInputClick: boolean;
  itemToStringLabel?: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;
  modal: boolean;
  autoHighlight: false | 'always' | 'input-change';
  submitOnItemClick: boolean;
  hasInputValue: boolean;
};

export type ComboboxStore = SolidStore<State, {}, typeof selectors>;

export const selectors = {
  id: (state: State) => state.id,

  query: (state: State) => state.query,

  items: (state: State) => state.items,

  selectedValue: (state: State) => state.selectedValue,
  hasSelectionChips: (state: State) => {
    const selectedValue = state.selectedValue;
    return Array.isArray(selectedValue) && selectedValue.length > 0;
  },

  hasSelectedValue: (state: State) => {
    const { selectedValue, selectionMode } = state;
    if (selectedValue == null) {
      return false;
    }
    if (selectionMode === 'multiple' && Array.isArray(selectedValue)) {
      return selectedValue.length > 0;
    }
    return true;
  },

  hasNullItemLabel: (state: State, enabled: Accessor<boolean>) => {
    return enabled() ? hasNullItemLabel(state.items) : false;
  },

  open: (state: State) => state.open,
  mounted: (state: State) => state.mounted,
  forceMounted: (state: State) => state.forceMounted,

  inline: (state: State) => state.inline,

  activeIndex: (state: State) => state.activeIndex,
  selectedIndex: (state: State) => state.selectedIndex,
  isActive: (state: State, index: Accessor<number>) => state.activeIndex === index(),
  isSelected: (state: State, itemValue: Accessor<any>) => {
    const comparer = state.isItemEqualToValue;
    const selectedValue = state.selectedValue;
    if (Array.isArray(selectedValue)) {
      return selectedValue.some((selectedItem) =>
        compareItemEquality(itemValue(), selectedItem, comparer),
      );
    }
    return compareItemEquality(itemValue(), selectedValue, comparer);
  },

  transitionStatus: (state: State) => state.transitionStatus,

  popupProps: (state: State) => state.popupProps,
  inputProps: (state: State) => state.inputProps,
  triggerProps: (state: State) => state.triggerProps,
  getItemProps: (state: State) => state.getItemProps,

  positionerElement: (state: State) => state.positionerElement,
  listElement: (state: State) => state.listElement,
  triggerElement: (state: State) => state.triggerElement,
  inputElement: (state: State) => state.inputElement,
  popupSide: (state: State) => state.popupSide,

  openMethod: (state: State) => state.openMethod,

  inputInsidePopup: (state: State) => state.inputInsidePopup,

  selectionMode: (state: State) => state.selectionMode,
  listRef: (state: State) => state.listRef,
  labelsRef: (state: State) => state.labelsRef,
  popupRef: (state: State) => state.popupRef,
  emptyRef: (state: State) => state.emptyRef,
  inputRef: (state: State) => state.inputRef,
  keyboardActiveRef: (state: State) => state.keyboardActiveRef,
  chipsContainerRef: (state: State) => state.chipsContainerRef,
  clearRef: (state: State) => state.clearRef,
  valuesRef: (state: State) => state.valuesRef,
  allValuesRef: (state: State) => state.allValuesRef,

  name: (state: State) => state.name,
  disabled: (state: State) => state.disabled,
  readOnly: (state: State) => state.readOnly,
  required: (state: State) => state.required,
  grid: (state: State) => state.grid,
  isGrouped: (state: State) => state.isGrouped,
  virtualized: (state: State) => state.virtualized,
  onOpenChangeComplete: (state: State) => state.onOpenChangeComplete,
  openOnInputClick: (state: State) => state.openOnInputClick,
  itemToStringLabel: (state: State) => state.itemToStringLabel,
  isItemEqualToValue: (state: State) => state.isItemEqualToValue,
  modal: (state: State) => state.modal,
  autoHighlight: (state: State) => state.autoHighlight,
  submitOnItemClick: (state: State) => state.submitOnItemClick,
};
