import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { stopEvent } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxChipsContext } from '../chips/ComboboxChipsContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxChipContext } from './ComboboxChipContext';

/**
 * An individual chip that represents a value in a multiselectable input.
 * Renders a `<div>` element.
 */
export function ComboboxChip(componentProps: ComboboxChip.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const store = useComboboxRootContext();
  const { setHighlightedChipIndex, refs } = useComboboxChipsContext()!;

  const disabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');

  const { setRef, index } = useCompositeListItem();

  function handleKeyDown(event: KeyboardEvent) {
    const idx = index();
    const val = selectedValue();
    let nextIndex: number | undefined = idx;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (idx > 0) {
        nextIndex = idx - 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (idx < val.length - 1) {
        nextIndex = idx + 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      const computedNextIndex = idx >= val.length - 1 ? val.length - 2 : idx;
      nextIndex = computedNextIndex >= 0 ? computedNextIndex : undefined;

      stopEvent(event);

      store.state.setIndices({ activeIndex: null, selectedIndex: null, type: 'keyboard' });
      store.state.setSelectedValue(
        val.filter((_: any, i: number) => i !== idx),
        createChangeEventDetails(REASONS.none, event),
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      stopEvent(event);
      nextIndex = undefined;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      stopEvent(event);
      store.state.setOpen(true, createChangeEventDetails(REASONS.listNavigation, event));
      nextIndex = undefined;
    } else if (
      // Check for printable characters (letters, numbers, symbols)
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      nextIndex = undefined;
    }

    return nextIndex;
  }

  const state: ComboboxChip.State = {
    get disabled() {
      return disabled();
    },
  };

  const element = useRenderElement('div', componentProps, {
    ref: setRef,
    state,
    props: [
      {
        tabIndex: -1,
        get 'aria-disabled'() {
          return disabled() || undefined;
        },
        get 'aria-readonly'() {
          return readOnly() || undefined;
        },
        onKeyDown(event) {
          if (disabled() || readOnly()) {
            return;
          }

          const nextIndex = handleKeyDown(event);

          setHighlightedChipIndex(nextIndex);

          if (nextIndex === undefined) {
            store.state.inputRef?.focus();
          } else {
            refs.chipsRef[nextIndex]?.focus();
          }
        },
        onMouseDown(event) {
          if (readOnly()) {
            return;
          }

          event.preventDefault();

          if (disabled()) {
            return;
          }
          store.state.inputRef?.focus();
        },
      },
      elementProps,
    ],
  });

  const contextValue: ComboboxChipContext = {
    index,
  };

  return (
    <ComboboxChipContext.Provider value={contextValue}>{element()}</ComboboxChipContext.Provider>
  );
}

export interface ComboboxChipState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipProps extends BaseUIComponentProps<'div', ComboboxChip.State> {}

export namespace ComboboxChip {
  export type State = ComboboxChipState;
  export type Props = ComboboxChipProps;
}
