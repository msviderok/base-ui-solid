import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import {
  useComboboxDerivedItemsContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';

/**
 * Renders its children only when the list is empty.
 * Requires the `items` prop on the root component.
 * Announces changes politely to screen readers.
 * Renders a `<div>` element.
 */
export function ComboboxEmpty(componentProps: ComboboxEmpty.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);

  const { filteredItems } = useComboboxDerivedItemsContext();
  const store = useComboboxRootContext();

  const element = useRenderElement('div', componentProps, {
    ref: (el) => {
      store.setState('emptyRef', el);
    },
    props: [
      {
        get children() {
          return filteredItems().length === 0 ? local.children : null;
        },
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': true,
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface ComboboxEmptyState {}

export interface ComboboxEmptyProps extends BaseUIComponentProps<'div', ComboboxEmpty.State> {}

export namespace ComboboxEmpty {
  export type State = ComboboxEmptyState;
  export type Props = ComboboxEmptyProps;
}
