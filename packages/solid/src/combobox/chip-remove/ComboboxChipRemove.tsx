import { stopEvent } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { findItemIndex } from '../../utils/itemEquality';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxChipContext } from '../chip/ComboboxChipContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * A button to remove a chip.
 * Renders a `<button>` element.
 */
export function ComboboxChipRemove(componentProps: ComboboxChipRemove.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
  const disabledProp = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const { store } = useComboboxRootContext();
  const { index } = useComboboxChipContext();

  const comboboxDisabled = store.useSelector('disabled');
  const readOnly = store.useSelector('readOnly');
  const selectedValue = store.useSelector('selectedValue');

  const disabled = () => comboboxDisabled() || disabledProp();

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled: () => disabled() || readOnly(),
    focusableWhenDisabled: true,
  });

  const state: ComboboxChipRemove.State = {
    get disabled() {
      return disabled();
    },
  };

  function clearActiveIndexForRemovedItem(removedItem: any) {
    const activeIndex = store.state.activeIndex;

    if (activeIndex == null) {
      return;
    }

    // Try current visible list first; if not found, it's filtered out.
    // No need to clear highlight in that case since it can't equal activeIndex.
    const removedIndex = findItemIndex(
      store.context.valuesRef,
      removedItem,
      store.context.isItemEqualToValue,
    );
    if (removedIndex !== -1 && activeIndex === removedIndex) {
      store.context.setIndices({
        activeIndex: null,
        type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
      });
    }
  }

  function removeChip(event: MouseEvent | KeyboardEvent) {
    const idx = index();
    const val = selectedValue();
    const eventDetails = createChangeEventDetails(REASONS.chipRemovePress, event);
    const removedItem = val[idx];

    clearActiveIndexForRemovedItem(removedItem);

    store.context.setSelectedValue(
      val.filter((_: any, i: number) => i !== idx),
      eventDetails,
    );

    store.state.inputRef?.focus();
    return eventDetails;
  }

  const element = useRenderElement('button', componentProps, {
    ref: buttonRef,
    state,
    props: [
      {
        tabIndex: -1,
        onClick(event: MouseEvent) {
          if (disabled() || readOnly()) {
            return;
          }

          const eventDetails = removeChip(event);
          if (!eventDetails.isPropagationAllowed) {
            event.stopPropagation();
          }
        },
        onKeyDown(event: KeyboardEvent) {
          if (disabled() || readOnly()) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            const eventDetails = removeChip(event);
            if (!eventDetails.isPropagationAllowed) {
              stopEvent(event);
            }
          }
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return <>{element()}</>;
}

export interface ComboboxChipRemoveState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipRemoveProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxChipRemove.State> {}

export namespace ComboboxChipRemove {
  export type State = ComboboxChipRemoveState;
  export type Props = ComboboxChipRemoveProps;
}
