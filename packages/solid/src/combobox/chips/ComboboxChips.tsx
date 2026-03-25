import { createEffect, createSignal } from 'solid-js';
import { CompositeList } from '../../composite/list/CompositeList';
import { splitComponentProps, useRef } from '../../solid-helpers';
import { EMPTY_OBJECT } from '../../utils/constants';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxChipsContext } from './ComboboxChipsContext';

/**
 * A container for the chips in a multiselectable input.
 * Renders a `<div>` element.
 */
export function ComboboxChips(componentProps: ComboboxChips.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { store } = useComboboxRootContext();

  const open = store.useSelector('open');
  const hasSelectionChips = store.useSelector('hasSelectionChips');

  const [highlightedChipIndex, setHighlightedChipIndex] = createSignal<number | undefined>(
    undefined,
  );

  createEffect(() => {
    if (open() && highlightedChipIndex() !== undefined) {
      setHighlightedChipIndex(undefined);
    }
  });

  const chipsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      store.set('chipsContainerRef', el);
    },
    // NVDA enters browse mode instead of staying in focus mode when navigating with
    // arrow keys inside a container unless it has a toolbar role.
    get props() {
      return [hasSelectionChips() ? { role: 'toolbar' } : EMPTY_OBJECT, elementProps];
    },
  });

  const contextValue: ComboboxChipsContext = {
    highlightedChipIndex,
    setHighlightedChipIndex,
    chipsRef,
  };

  return (
    <ComboboxChipsContext.Provider value={contextValue}>
      <CompositeList refs={{ elements: chipsRef.current }}>{element()}</CompositeList>
    </ComboboxChipsContext.Provider>
  );
}

export interface ComboboxChipsState {}

export interface ComboboxChipsProps extends BaseUIComponentProps<'div', ComboboxChips.State> {}

export namespace ComboboxChips {
  export type State = ComboboxChipsState;
  export type Props = ComboboxChipsProps;
}
