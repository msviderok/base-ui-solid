import { createContext, useContext } from 'solid-js';
import type { ElementProps } from '../../floating-ui-solid';

export const NavigationMenuDismissContext = createContext<ElementProps | undefined>(undefined);

export function useNavigationMenuDismissContext() {
  return useContext(NavigationMenuDismissContext);
}
