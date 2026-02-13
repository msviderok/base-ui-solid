import { createContext, useContext } from 'solid-js';
import { type MenuStore } from '../store/MenuStore';
import { MenuParent } from './MenuRoot';

export type InstantType = 'dismiss' | 'click' | 'group';

export interface MenuRootContext<Payload = unknown> {
  store: MenuStore<Payload>;
  parent: MenuParent;
}

export const MenuRootContext = createContext<MenuRootContext>();

export function useMenuRootContext(optional?: false): MenuRootContext;
export function useMenuRootContext(optional: true): MenuRootContext | undefined;
export function useMenuRootContext(optional?: boolean) {
  const context = useContext(MenuRootContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuRootContext is missing. Menu parts must be placed within <Menu.Root>.',
    );
  }

  return context;
}
