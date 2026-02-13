import { createContext, useContext } from 'solid-js';
import { MenuStore } from '../store/MenuStore';

export const MenuSubmenuRootContext = createContext<MenuSubmenuRootContext | undefined>(undefined);

export interface MenuSubmenuRootContext {
  parentMenu: MenuStore<unknown>;
}

export function useMenuSubmenuRootContext(): MenuSubmenuRootContext | undefined {
  return useContext(MenuSubmenuRootContext);
}
