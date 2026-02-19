import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';

/**
 * A container for the drawer contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export function DrawerContent(componentProps: DrawerContent.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  useDialogRootContext();

  const element = useRenderElement('div', componentProps, {
    props: [{ ['data-swipe-ignore' as string]: '' }, elementProps],
  });

  return <>{element()}</>;
}

export interface DrawerContentProps extends BaseUIComponentProps<'div', DrawerContent.State> {}
export interface DrawerContentState {}

export namespace DrawerContent {
  export type Props = DrawerContentProps;
  export type State = DrawerContentState;
}
