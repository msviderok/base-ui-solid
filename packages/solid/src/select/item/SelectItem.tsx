import { batch, createEffect, createMemo, onCleanup, type JSX } from 'solid-js';
import {
  IndexGuessBehavior,
  useCompositeListItem,
} from '../../composite/list/useCompositeListItem';
import { mergeProps } from '../../merge-props/mergeProps';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { isMouseWithinBounds } from '../../utils/isMouseWithinBounds';
import { compareItemEquality, removeItem } from '../../utils/itemEquality';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { useSelectRootContext } from '../root/SelectRootContext';
import { SelectItemContext } from './SelectItemContext';

/**
 * An individual option in the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItem(componentProps: SelectItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'value',
    'label',
    'disabled',
    'nativeButton',
  ]);
  const value = () => local.value ?? null;
  const disabled = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? false;

  const refs: SelectItemContext['refs'] = {
    indexRef: 0,
    textRef: null,
  };

  const listItem = useCompositeListItem({
    label: () => local.label,
    textRef: () => refs.textRef,
    indexGuessBehavior: IndexGuessBehavior.GuessFromOrder,
  });

  createEffect(() => {
    refs.indexRef = listItem.index();
  });

  const {
    store,
    setStore,
    selectors,
    getItemProps,
    setOpen,
    setValue,
    multiple,
    highlightItemOnHover,
    refs: rootRefs,
  } = useSelectRootContext();

  const highlightTimeout = useTimeout();

  const highlighted = () => store.useState('isActive', listItem.index())();
  const selected = () => store.useState('isSelected', listItem.index(), value())();
  const selectedByFocus = () => store.useState('isSelectedByFocus', listItem.index())();
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const index = listItem.index;
  const hasRegistered = () => index() !== -1;

  createEffect(() => {
    if (!hasRegistered()) {
      return;
    }

    const values = rootRefs.valuesRef;
    const idx = listItem.index();
    values[idx] = value();

    onCleanup(() => {
      delete values[idx];
    });
  });

  createEffect(() => {
    if (!hasRegistered()) {
      return;
    }

    const selectedValue = store.state.value;

    let candidate = selectedValue;
    if (multiple() && Array.isArray(selectedValue()) && selectedValue().length > 0) {
      candidate = selectedValue[selectedValue.length - 1];
    }

    if (candidate !== undefined && compareItemEquality(candidate, value(), isItemEqualToValue())) {
      store.set('selectedIndex', index());
    }
  });

  const state: SelectItem.State = {
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

  const rootProps = createMemo(() => {
    const props = getItemProps({ active: highlighted(), selected: selected() });
    // With our custom `focusItemOnHover` implementation, this interferes with the logic and can
    // cause the index state to be stuck when leaving the select popup.
    props.onFocus = undefined;
    props.id = undefined;
    return props;
  });

  let lastKeyRef = null as string | null;
  let pointerTypeRef = 'mouse' as 'mouse' | 'touch' | 'pen';
  let didPointerDownRef = false;

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  function commitSelection(event: MouseEvent) {
    batch(() => {
      const selectedValue = store.state.value;
      if (multiple()) {
        const currentValue = Array.isArray(selectedValue) ? selectedValue : [];
        const nextValue = selected()
          ? removeItem(currentValue, value(), isItemEqualToValue())
          : [...currentValue, value()];
        setValue(nextValue, createChangeEventDetails(REASONS.itemPress, event));
      } else {
        setValue(value(), createChangeEventDetails(REASONS.itemPress, event));
        setOpen(false, createChangeEventDetails(REASONS.itemPress, event));
      }
    });
  }

  const defaultProps: HTMLProps = {
    role: 'option',
    get 'aria-selected'() {
      return selected();
    },
    get tabIndex() {
      return highlighted() ? 0 : -1;
    },
    onFocus() {
      store.set('activeIndex', index());
    },
    onMouseEnter() {
      if (!rootRefs.keyboardActiveRef && store.state.selectedIndex === null) {
        store.set('activeIndex', index());
      }
    },
    onMouseMove() {
      if (highlightItemOnHover()) {
        store.set('activeIndex', index());
      }
    },
    onMouseLeave(event) {
      if (!highlightItemOnHover() || rootRefs.keyboardActiveRef || isMouseWithinBounds(event)) {
        return;
      }

      highlightTimeout.start(0, () => {
        if (store.state.activeIndex === index()) {
          store.set('activeIndex', null);
        }
      });
    },
    onTouchStart() {
      rootRefs.selectionRef = {
        allowSelectedMouseUp: false,
        allowUnselectedMouseUp: false,
      };
    },
    onKeyDown(event) {
      lastKeyRef = event.key;
      store.set('activeIndex', index());
    },
    onClick(event) {
      didPointerDownRef = false;

      // Prevent double commit on {Enter}
      if (event.type === 'keydown' && lastKeyRef === null) {
        return;
      }

      if (
        disabled() ||
        (lastKeyRef === ' ' && rootRefs.typingRef) ||
        (pointerTypeRef !== 'touch' && !highlighted())
      ) {
        return;
      }

      lastKeyRef = null;
      commitSelection(event);
    },
    onPointerEnter(event) {
      pointerTypeRef = event.pointerType as 'mouse' | 'touch' | 'pen';
    },
    onPointerDown(event) {
      pointerTypeRef = event.pointerType as 'mouse' | 'touch' | 'pen';
      didPointerDownRef = true;
    },
    onMouseUp(event) {
      if (disabled()) {
        return;
      }

      if (didPointerDownRef) {
        didPointerDownRef = false;
        return;
      }

      const disallowSelectedMouseUp = !rootRefs.selectionRef.allowSelectedMouseUp && selected();
      const disallowUnselectedMouseUp =
        !rootRefs.selectionRef.allowUnselectedMouseUp && !selected();

      if (
        disallowSelectedMouseUp ||
        disallowUnselectedMouseUp ||
        (pointerTypeRef !== 'touch' && !highlighted())
      ) {
        return;
      }

      commitSelection(event);
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      buttonRef(el);
      listItem.setRef(el);
    },
    props: [(props) => mergeProps(props, rootProps()), defaultProps, elementProps, getButtonProps],
  });

  const contextValue: SelectItemContext = {
    selected,
    refs,
    selectedByFocus,
    hasRegistered,
  };

  return <SelectItemContext.Provider value={contextValue}>{element()}</SelectItemContext.Provider>;
}

export interface SelectItemState {
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

export interface SelectItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', SelectItem.State>, 'id'> {
  children?: JSX.Element;
  /**
   * A unique value that identifies this select item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * Specifies the text label to use when the item is matched during keyboard text navigation.
   *
   * Defaults to the item text content if not provided.
   */
  label?: string;
}

export namespace SelectItem {
  export type State = SelectItemState;
  export type Props = SelectItemProps;
}
