import { createContext, useContext, type Accessor, type JSX } from 'solid-js';
import { type ReactLikeRef } from '../../solid-helpers';
import type { Align, Side } from '../../utils/useAnchorPositioning';

export interface MenuPositionerContext {
  /**
   * The side of the anchor element the popup is positioned relative to.
   */
  side: Accessor<Side>;
  /**
   * How to align the popup relative to the specified side.
   */
  align: Accessor<Align>;
  arrowRef: ReactLikeRef<Element | null | undefined>;
  arrowUncentered: Accessor<boolean>;
  arrowStyles: Accessor<JSX.CSSProperties>;
  nodeId: Accessor<string | undefined>;
}

export const MenuPositionerContext = createContext<MenuPositionerContext>();

export function useMenuPositionerContext(optional?: false): MenuPositionerContext;
export function useMenuPositionerContext(optional: true): MenuPositionerContext | undefined;
export function useMenuPositionerContext(optional?: boolean) {
  const context = useContext(MenuPositionerContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuPositionerContext is missing. MenuPositioner parts must be placed within <Menu.Positioner>.',
    );
  }
  return context;
}
