import { splitComponentProps } from '@msviderok/base-ui-solid/solid-helpers';
import { createMemo, Show } from 'solid-js';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useComboboxInputValueContext, useComboboxRootContext } from '../root/ComboboxRootContext';

const stateAttributesMapping: StateAttributesMapping<ComboboxClear.State> = {
  ...transitionStatusMapping,
  ...triggerOpenStateMapping,
};

/**
 * Clears the value when clicked.
 * Renders a `<button>` element.
 */
export function ComboboxClear(componentProps: ComboboxClear.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'nativeButton',
    'keepMounted',
  ]);
  const disabledProp = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;
  const keepMounted = () => local.keepMounted ?? false;

  const { disabled: fieldDisabled } = useFieldRootContext();
  const store = useComboboxRootContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const hasSelectionChips = store.useState('hasSelectionChips');

  const inputValue = useComboboxInputValueContext();

  const visible = createMemo(() => {
    if (selectionMode() === 'none') {
      return inputValue() !== '';
    }
    if (selectionMode() === 'single') {
      return selectedValue() != null;
    }
    return hasSelectionChips();
  });

  const disabled = () => fieldDisabled() || comboboxDisabled() || disabledProp();

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled,
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(visible);

  const state: ComboboxClear.State = {
    get disabled() {
      return disabled();
    },
    get open() {
      return open();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  useOpenChangeComplete({
    open: visible,
    ref: store.state.clearRef,
    onComplete() {
      if (!visible()) {
        setMounted(false);
      }
    },
  });

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      buttonRef(el);
      store.setState('clearRef', el);
    },
    props: [
      {
        tabIndex: -1,
        children: 'x',
        // Avoid stealing focus from the input.
        onMouseDown(event) {
          event.preventDefault();
        },
        onClick(event) {
          if (disabled() || readOnly()) {
            return;
          }

          const keyboardActiveRef = store.state.keyboardActiveRef;

          store.state.setInputValue('', createChangeEventDetails(REASONS.clearPress, event));

          if (selectionMode() !== 'none') {
            store.state.setSelectedValue(
              Array.isArray(selectedValue) ? [] : null,
              createChangeEventDetails(REASONS.clearPress, event),
            );
            store.state.setIndices({
              activeIndex: null,
              selectedIndex: null,
              type: keyboardActiveRef ? 'keyboard' : 'pointer',
            });
          } else {
            store.state.setIndices({
              activeIndex: null,
              type: keyboardActiveRef ? 'keyboard' : 'pointer',
            });
          }

          store.state.inputRef?.focus();
        },
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  const shouldRender = () => keepMounted() || mounted();

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface ComboboxClearState {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  transitionStatus: TransitionStatus;
}

export interface ComboboxClearProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxClear.State> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the component should remain mounted in the DOM when not visible.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace ComboboxClear {
  export type State = ComboboxClearState;
  export type Props = ComboboxClearProps;
}
