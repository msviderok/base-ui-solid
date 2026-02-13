import { createEffect, onCleanup } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuGroupLabel(componentProps: MenuGroupLabel.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['id']);
  const idProp = () => local.id;

  const id = useBaseUiId(idProp);

  const { setLabelId } = useMenuGroupRootContext();

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
        role: 'presentation',
      },
      elementProps,
    ],
  });

  return <>{element()}</>;
}

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabel.State> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}
