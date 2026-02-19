import { createContext, useContext, type Accessor, type JSX } from 'solid-js';
import type { Align, Side } from '../../utils/useAnchorPositioning';

export interface ComboboxPositionerContext {
  side: Accessor<Side>;
  align: Accessor<Align>;
  refs: {
    arrowRef: (Element | null) | undefined;
  };
  arrowUncentered: Accessor<boolean>;
  arrowStyles: JSX.CSSProperties;
  anchorHidden: Accessor<boolean>;
  isPositioned: Accessor<boolean>;
}

export const ComboboxPositionerContext = createContext<ComboboxPositionerContext | undefined>(
  undefined,
);

export function useComboboxPositionerContext(optional?: false): ComboboxPositionerContext;
export function useComboboxPositionerContext(optional: true): ComboboxPositionerContext | undefined;
export function useComboboxPositionerContext(optional?: boolean) {
  const context = useContext(ComboboxPositionerContext);
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: <Combobox.Popup> and <Combobox.Arrow> must be used within the <Combobox.Positioner> component',
    );
  }
  return context;
}
