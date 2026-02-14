import { createContext, useContext } from 'solid-js';
import { useAnchorPositioning } from '../../utils/useAnchorPositioning';

export type NavigationMenuPositionerContext = ReturnType<typeof useAnchorPositioning>;

export const NavigationMenuPositionerContext = createContext<
  NavigationMenuPositionerContext | undefined
>(undefined);

export function useNavigationMenuPositionerContext(
  optional: true,
): NavigationMenuPositionerContext | undefined;
export function useNavigationMenuPositionerContext(
  optional?: false,
): NavigationMenuPositionerContext;
export function useNavigationMenuPositionerContext(optional = false) {
  const context = useContext(NavigationMenuPositionerContext);
  if (!context && !optional) {
    throw new Error(
      'Base UI: NavigationMenuPositionerContext is missing. NavigationMenuPositioner parts must be placed within <NavigationMenu.Positioner>.',
    );
  }
  return context;
}
