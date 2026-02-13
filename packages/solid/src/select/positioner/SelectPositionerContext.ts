import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import { useAnchorPositioning, type Side } from '../../utils/useAnchorPositioning';

export interface SelectPositionerContext extends Omit<
  useAnchorPositioning.ReturnValue,
  'side' | 'refs'
> {
  side: Accessor<'none' | Side>;
  alignItemWithTriggerActive: Accessor<boolean>;
  setControlledAlignItemWithTrigger: Setter<boolean>;
  refs: useAnchorPositioning.ReturnValue['refs'] & {
    scrollUpArrowRef: HTMLDivElement | null | undefined;
    scrollDownArrowRef: HTMLDivElement | null | undefined;
  };
}

export const SelectPositionerContext = createContext<SelectPositionerContext | undefined>(
  undefined,
);

export function useSelectPositionerContext() {
  const context = useContext(SelectPositionerContext);
  if (!context) {
    throw new Error(
      'Base UI: SelectPositionerContext is missing. SelectPositioner parts must be placed within <Select.Positioner>.',
    );
  }
  return context;
}
