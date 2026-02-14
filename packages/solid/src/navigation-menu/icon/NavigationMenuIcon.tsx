import { splitComponentProps } from '../../solid-helpers';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useNavigationMenuItemContext } from '../item/NavigationMenuItemContext';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/**
 * An icon that indicates that the trigger button opens a menu.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuIcon(componentProps: NavigationMenuIcon.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { value: itemValue } = useNavigationMenuItemContext();
  const { open, value } = useNavigationMenuRootContext();

  const isActiveItem = () => open() && value() === itemValue();

  const state: NavigationMenuIcon.State = {
    get open() {
      return isActiveItem();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    props: [{ 'aria-hidden': true, children: '▼' }, elementProps],
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export interface NavigationMenuIconState {
  /**
   * Whether the navigation menu is open and the item is active.
   */
  open: boolean;
}

export interface NavigationMenuIconProps extends BaseUIComponentProps<
  'span',
  NavigationMenuIcon.State
> {}

export namespace NavigationMenuIcon {
  export type State = NavigationMenuIconState;
  export type Props = NavigationMenuIconProps;
}
