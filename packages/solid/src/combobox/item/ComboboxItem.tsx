import { createEffect, onCleanup, type JSX } from 'solid-js';
import {
  IndexGuessBehavior,
  useCompositeListItem,
} from '../../composite/list/useCompositeListItem';
import { splitComponentProps, useRef } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { compareItemEquality, findItemIndex } from '../../utils/itemEquality';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import {
  useComboboxDerivedItemsContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { useComboboxRowContext } from '../row/ComboboxRowContext';
import { ComboboxItemContext } from './ComboboxItemContext';

/**
 * An individual item in the list.
 * Renders a `<div>` element.
 */
export function ComboboxItem(componentProps: ComboboxItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'value',
    'index',
    'disabled',
    'nativeButton',
  ]);

  const itemValue = () => local.value ?? null;
  const indexProp = () => local.index;
  const disabled = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? false;

  let didPointerDownRef = false;
  const textRef = useRef<HTMLElement | null | undefined>(null);
  const listItem = useCompositeListItem({
    index: indexProp,
    textRef: () => textRef.current,
    indexGuessBehavior: IndexGuessBehavior.GuessFromOrder,
  });

  const { store } = useComboboxRootContext();
  const isRow = useComboboxRowContext();
  const { flatFilteredItems, hasItems } = useComboboxDerivedItemsContext();

  const open = store.useSelector('open');
  const selectionMode = store.useSelector('selectionMode');
  const readOnly = store.useSelector('readOnly');
  const virtualized = store.useSelector('virtualized');

  const selectable = () => selectionMode() !== 'none';
  const index = () =>
    indexProp() ??
    (virtualized()
      ? findItemIndex(flatFilteredItems(), itemValue(), store.context.isItemEqualToValue)
      : listItem.index());
  const hasRegistered = () => listItem.index() !== -1;

  const rootId = store.useSelector('id');
  const highlighted = () => store.selectors.isActive(index);
  const matchesSelectedValue = () => store.selectors.isSelected(itemValue);

  let itemRef = null as HTMLDivElement | null | undefined;

  const id = () => (rootId() != null && hasRegistered() ? `${rootId()}-${index()}` : undefined);
  const selected = () => matchesSelectedValue() && selectable();

  createEffect(() => {
    const shouldRun = hasRegistered() && (virtualized() || indexProp() != null);
    if (!shouldRun) {
      return;
    }

    store.context.listRef[index()] = itemRef;

    onCleanup(() => {
      delete store.context.listRef[index()];
    });
  });

  createEffect(() => {
    if (!hasRegistered() || hasItems()) {
      return;
    }

    store.context.valuesRef[index()] = itemValue();

    // Stable registry that doesn't depend on filtering. Assume that no
    // filtering had occurred at this point; otherwise, an `items` prop is
    // required.
    if (selectionMode() !== 'none') {
      store.context.allValuesRef.push(itemValue());
    }

    onCleanup(() => {
      delete store.context.valuesRef[index()];
    });
  });

  createEffect(() => {
    if (!open()) {
      didPointerDownRef = false;
      return;
    }

    if (!hasRegistered() || hasItems()) {
      return;
    }

    const selectedValue = store.selectors.selectedValue();
    const lastSelectedValue = Array.isArray(selectedValue)
      ? selectedValue[selectedValue.length - 1]
      : selectedValue;

    if (compareItemEquality(itemValue(), lastSelectedValue, store.context.isItemEqualToValue)) {
      store.set('selectedIndex', index());
    }
  });

  const state: ComboboxItem.State = {
    get disabled() {
      return disabled();
    },
    get selected() {
      return selected();
    },
    get highlighted() {
      return highlighted();
    },
  };

  const rootProps = () => {
    const props = store.context.getItemProps({ active: highlighted(), selected: selected() });
    props.id = undefined;
    props.onFocus = undefined;
    return props;
  };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  function commitSelection(nativeEvent: MouseEvent) {
    function selectItem() {
      store.context.handleSelection(nativeEvent, itemValue());
    }

    if (store.selectors.submitOnItemClick()) {
      selectItem();
      store.context.requestSubmit();
    } else {
      selectItem();
    }
  }

  const defaultProps: HTMLProps = {
    get id() {
      return id();
    },
    get role() {
      return isRow ? 'gridcell' : 'option';
    },
    get 'aria-selected'() {
      return selectable() ? selected() : undefined;
    },
    // Focusable items steal focus from the input upon mouseup.
    // Warn if the user renders a natively focusable element like `<button>`,
    // as it should be a `<div>` instead.
    tabIndex: undefined,
    'on:pointerdown': {
      capture: true,
      handleEvent(event) {
        didPointerDownRef = true;
        event.preventDefault();
      },
    },
    onClick(event) {
      if (disabled() || readOnly()) {
        return;
      }

      commitSelection(event);
    },
    onMouseUp(event) {
      const pointerStartedOnItem = didPointerDownRef;
      didPointerDownRef = false;

      if (
        disabled() ||
        readOnly() ||
        event.button !== 0 ||
        pointerStartedOnItem ||
        !highlighted()
      ) {
        return;
      }

      commitSelection(event);
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      buttonRef(el);
      listItem.setRef(el);
      itemRef = el;
    },
    state,
    get props() {
      return [rootProps(), defaultProps, elementProps, getButtonProps];
    },
  });

  const contextValue: ComboboxItemContext = {
    selected,
    textRef,
  };

  return (
    <ComboboxItemContext.Provider value={contextValue}>{element()}</ComboboxItemContext.Provider>
  );
}

export interface ComboboxItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface ComboboxItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', ComboboxItem.State>, 'id'> {
  children?: JSX.Element;
  /**
   * An optional click handler for the item when selected.
   * It fires when clicking the item with the pointer, as well as when pressing `Enter` with the keyboard if the item is highlighted when the `Input` or `List` element has focus.
   */
  onClick?: BaseUIComponentProps<'div', ComboboxItemState>['onClick'] | undefined;
  /**
   * The index of the item in the list. Improves performance when specified by avoiding the need to calculate the index automatically from the DOM.
   */
  index?: number | undefined;
  /**
   * A unique value that identifies this item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxItem {
  export type State = ComboboxItemState;
  export type Props = ComboboxItemProps;
}
