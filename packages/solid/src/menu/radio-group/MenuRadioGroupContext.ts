import { createContext, useContext, type Accessor } from 'solid-js';
import type { MenuRoot } from '../root/MenuRoot';

export interface MenuRadioGroupContext {
  value: Accessor<any>;
  setValue: (newValue: any, eventDetails: MenuRoot.ChangeEventDetails) => void;
  disabled: Accessor<boolean>;
}

export const MenuRadioGroupContext = createContext<MenuRadioGroupContext>();

export function useMenuRadioGroupContext() {
  const context = useContext(MenuRadioGroupContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuRadioGroupContext is missing. MenuRadioGroup parts must be placed within <Menu.RadioGroup>.',
    );
  }

  return context;
}
