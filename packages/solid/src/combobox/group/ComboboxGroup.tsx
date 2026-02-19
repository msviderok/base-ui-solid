import { createSignal, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { GroupCollectionProvider } from '../collection/GroupCollectionContext';
import { ComboboxGroupContext } from './ComboboxGroupContext';

/**
 * Groups related items with the corresponding label.
 * Renders a `<div>` element.
 */
export function ComboboxGroup(componentProps: ComboboxGroup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['items']);

  const [labelId, setLabelId] = createSignal<string | undefined>();

  const contextValue = {
    labelId,
    setLabelId,
    items: () => local.items,
  };

  const element = useRenderElement('div', componentProps, {
    props: [
      {
        role: 'group',
        get 'aria-labelledby'() {
          return labelId();
        },
      },
      elementProps,
    ],
  });

  return (
    <Show
      when={local.items}
      fallback={
        <ComboboxGroupContext.Provider value={contextValue}>
          {element()}
        </ComboboxGroupContext.Provider>
      }
    >
      {(items) => (
        <GroupCollectionProvider items={items()}>
          <ComboboxGroupContext.Provider value={contextValue}>
            {element()}
          </ComboboxGroupContext.Provider>
        </GroupCollectionProvider>
      )}
    </Show>
  );
}

export interface ComboboxGroupState {}

export interface ComboboxGroupProps extends BaseUIComponentProps<'div', ComboboxGroup.State> {
  /**
   * Items to be rendered within this group.
   * When provided, child `Collection` components will use these items.
   */
  items?: readonly any[] | undefined;
}

export namespace ComboboxGroup {
  export type State = ComboboxGroupState;
  export type Props = ComboboxGroupProps;
}
