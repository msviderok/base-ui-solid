import { createEffect } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useSelectGroupContext } from '../group/SelectGroupContext';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectGroupLabel(componentProps: SelectGroupLabel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const { setLabelId } = useSelectGroupContext();

  const id = useBaseUiId(idProp);

  createEffect(() => {
    setLabelId(id());
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

export interface SelectGroupLabelState {}

export interface SelectGroupLabelProps extends BaseUIComponentProps<
  'div',
  SelectGroupLabel.State
> {}

export namespace SelectGroupLabel {
  export type State = SelectGroupLabelState;
  export type Props = SelectGroupLabelProps;
}
