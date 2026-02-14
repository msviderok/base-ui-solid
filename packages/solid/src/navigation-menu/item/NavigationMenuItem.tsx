import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import {
  NavigationMenuItemContext,
  NavigationMenuItemContextValue,
} from './NavigationMenuItemContext';

/**
 * An individual navigation menu item.
 * Renders a `<li>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuItem(componentProps: NavigationMenuItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['value']);
  const valueProp = () => local.value;

  const fallbackValue = useBaseUiId();
  const value = () => valueProp() ?? fallbackValue();

  const contextValue: NavigationMenuItemContextValue = { value };

  const element = useRenderElement('li', componentProps, { props: elementProps });

  return (
    <NavigationMenuItemContext.Provider value={contextValue}>
      {element()}
    </NavigationMenuItemContext.Provider>
  );
}

export interface NavigationMenuItemState {}

export interface NavigationMenuItemProps extends BaseUIComponentProps<
  'li',
  NavigationMenuItem.State
> {
  /**
   * A unique value that identifies this navigation menu item.
   * If no value is provided, a unique ID will be generated automatically.
   * Use when controlling the navigation menu programmatically.
   */
  value?: any;
}

export namespace NavigationMenuItem {
  export type State = NavigationMenuItemState;
  export type Props = NavigationMenuItemProps;
}
