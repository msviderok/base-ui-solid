import { createEffect, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxGroupContext } from '../group/ComboboxGroupContext';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 */
export function ComboboxGroupLabel(componentProps: ComboboxGroupLabel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const { setLabelId } = useComboboxGroupContext();

  const id = useBaseUiId(idProp);

  createEffect(() => {
    setLabelId(id());
    onCleanup(() => {
      setLabelId(undefined);
    });
  });

  const element = useRenderElement('div', componentProps, {
    props: [
      {
        get id() {
          return id();
        },
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface ComboboxGroupLabelState {}

export interface ComboboxGroupLabelProps extends BaseUIComponentProps<
  'div',
  ComboboxGroupLabel.State
> {}

export namespace ComboboxGroupLabel {
  export type State = ComboboxGroupLabelState;
  export type Props = ComboboxGroupLabelProps;
}
