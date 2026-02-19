import { type Accessor, createContext, useContext } from 'solid-js';
import type { Store } from 'solid-js/store';

export interface DrawerProviderContext {
  setDrawerOpen: (drawerId: string, open: boolean) => void;
  removeDrawer: (drawerId: string) => void;
  active: Accessor<boolean>;
  visualStateStore: Store<DrawerVisualState>;
  setVisualState: (state: Partial<DrawerVisualState>) => void;
}

export const DrawerProviderContext = createContext<DrawerProviderContext | undefined>(undefined);

export interface DrawerVisualState {
  swipeProgress: number;
  frontmostHeight: number;
}

export function useDrawerProviderContext(optional?: false): DrawerProviderContext;
export function useDrawerProviderContext(optional: true): DrawerProviderContext | undefined;
export function useDrawerProviderContext(optional?: boolean) {
  const context = useContext(DrawerProviderContext);

  if (optional === false && context === undefined) {
    throw new Error('Base UI: DrawerProviderContext is missing. Use <Drawer.Provider>.');
  }

  return context;
}
