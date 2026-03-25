import { createMemo, mergeProps as solidMergeProps, type Accessor } from 'solid-js';
import { createStore } from 'solid-js/store';
import { compareItemEquality } from '../utils/itemEquality';
import { hasNullItemLabel } from '../utils/resolveValueLabel';
import type { HTMLProps } from '../utils/types';
import type { Side } from '../utils/useAnchorPositioning';
import type { InteractionType } from '../utils/useEnhancedClickHandler';
import type { TransitionStatus } from '../utils/useTransitionStatus';
import type { AriaCombobox } from './root/AriaCombobox';

// only fields that are mutated via store setter
export interface State {
  activeIndex: number | null;
  selectedIndex: number | null;
  forceMounted: boolean;
  transitionStatus: TransitionStatus;
  positionerElement: HTMLElement | null | undefined;
  listElement: HTMLElement | null | undefined;
  listboxId: string | undefined;
  triggerElement: HTMLElement | null | undefined;
  inputElement: HTMLInputElement | null | undefined;
  popupSide: Side | null;
  inputInsidePopup: boolean;
  popupRef: HTMLDivElement | null | undefined;
  emptyRef: HTMLDivElement | null | undefined;
  inputRef: HTMLInputElement | null | undefined;
  keyboardActiveRef: boolean;
  selectionEventRef: MouseEvent | PointerEvent | KeyboardEvent | null;
  chipsContainerRef: HTMLDivElement | null | undefined;
  clearRef: HTMLButtonElement | null | undefined;
}

// imperative callbacks only
export interface Context {
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
  onOpenChangeComplete: (open: boolean) => void;
  itemToStringLabel: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;
  listRef: Array<HTMLElement | null | undefined>;
  labelsRef: Array<string | null>;
  valuesRef: Array<any>;
  allValuesRef: Array<any>;
}

// prop pass-throughs supplied by AriaCombobox
export interface PassThroughs {
  id: Accessor<string | undefined>;
  open: Accessor<boolean>;
  query: Accessor<string>;
  selectionMode: Accessor<'single' | 'multiple' | 'none'>;
  name: Accessor<string | undefined>;
  disabled: Accessor<boolean>;
  readOnly: Accessor<boolean>;
  required: Accessor<boolean>;
  grid: Accessor<boolean>;
  isGrouped: Accessor<boolean>;
  virtualized: Accessor<boolean>;
  openOnInputClick: Accessor<boolean>;
  modal: Accessor<boolean>;
  autoHighlight: Accessor<false | 'always' | 'input-change'>;
  submitOnItemClick: Accessor<boolean>;
  inline: Accessor<boolean>;
  hasInputValue: Accessor<boolean>;
  selectedValue: Accessor<any>;
  items: Accessor<readonly any[] | undefined>;
  popupProps: HTMLProps;
  inputProps: HTMLProps;
  triggerProps: HTMLProps;
  mounted: Accessor<boolean>;
  openMethod: Accessor<InteractionType | null>;
}

export interface Selectors extends PassThroughs {
  hasSelectionChips: () => boolean;
  hasSelectedValue: () => boolean;
  hasNullItemLabel: (enabled: Accessor<boolean>) => boolean;
  isActive: (index: Accessor<number>) => boolean;
  isSelected: (itemValue: Accessor<any>) => boolean;
}

export function createComboboxStore(args: {
  initialState: State;
  passThroughs: PassThroughs;
  context: Context;
}) {
  const [state, setState] = createStore<State>(args.initialState);
  const selectors: Selectors = solidMergeProps(args.passThroughs, {
    hasSelectionChips: () => {
      const v = args.passThroughs.selectedValue();
      return Array.isArray(v) && v.length > 0;
    },

    hasSelectedValue: () => {
      const v = args.passThroughs.selectedValue();
      if (v == null) {
        return false;
      }
      if (args.passThroughs.selectionMode() === 'multiple' && Array.isArray(v)) {
        return v.length > 0;
      }
      return true;
    },

    hasNullItemLabel: (enabled: Accessor<boolean>) =>
      enabled() ? hasNullItemLabel(args.passThroughs.items()) : false,

    isActive: (index: Accessor<number>) => state.activeIndex === index(),

    isSelected: (itemValue: Accessor<any>) => {
      const sv = args.passThroughs.selectedValue();
      if (Array.isArray(sv)) {
        return sv.some((s) => compareItemEquality(itemValue(), s, args.context.isItemEqualToValue));
      }
      return compareItemEquality(itemValue(), sv, args.context.isItemEqualToValue);
    },
  });

  function useState<const Key extends keyof State>(key: Key): Accessor<State[Key]> {
    const memo = createMemo(() => state[key]);
    return memo;
  }

  function useSelector<Key extends keyof Selectors>(
    key: Key,
    ...params: SelectorArgs<Selectors[Key]>
  ): Selectors[Key] {
    const selector = selectors[key];
    if (typeof selector === 'function') {
      // @ts-expect-error - TODO: fix typing
      return () => selector(...params);
    }
    return selector;
  }

  return {
    state,
    set: setState,
    useState,
    selectors,
    useSelector,
    get context() {
      return args.context;
    },
  };
}

export type ComboboxStore = ReturnType<typeof createComboboxStore>;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

export type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
  ? Tail<Params>
  : never;
