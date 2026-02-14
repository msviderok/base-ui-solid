import { createContext, useContext, type Accessor } from 'solid-js';

export interface NavigationMenuItemContextValue {
  value: Accessor<any>;
}

export const NavigationMenuItemContext = createContext<NavigationMenuItemContextValue | undefined>(
  undefined,
);

export function useNavigationMenuItemContext() {
  const value = useContext(NavigationMenuItemContext);
  if (!value) {
    throw new Error(
      'Base UI: NavigationMenuItem parts must be used within a <NavigationMenu.Item>.',
    );
  }
  return value;
}
