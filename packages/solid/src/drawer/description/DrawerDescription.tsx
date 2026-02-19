import type { JSX } from 'solid-js';
import { DialogDescription } from '../../dialog/description/DialogDescription';
import type { BaseUIComponentProps } from '../../utils/types';

/**
 * A paragraph with additional information about the drawer.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/drawer)
 */
export const DrawerDescription = DialogDescription as DrawerDescription;

export interface DrawerDescriptionProps extends BaseUIComponentProps<
  'p',
  DrawerDescription.State
> {}

export interface DrawerDescriptionState {}

export interface DrawerDescription {
  (componentProps: DrawerDescriptionProps): JSX.Element;
}

export namespace DrawerDescription {
  export type Props = DrawerDescriptionProps;
  export type State = DrawerDescriptionState;
}
