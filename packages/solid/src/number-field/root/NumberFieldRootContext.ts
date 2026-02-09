import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import { Timeout } from '../../utils/useTimeout';
import type { IncrementValueParameters } from '../utils/types';
import { EventWithOptionalKeyState } from '../utils/types';
import type { NumberFieldRoot } from './NumberFieldRoot';

export type InputMode = 'numeric' | 'decimal' | 'text';

export interface NumberFieldRootContext {
  inputValue: Accessor<string>;
  value: Accessor<number | null>;
  startAutoChange: (isIncrement: boolean, event?: MouseEvent | Event) => void;
  stopAutoChange: () => void;
  minWithDefault: Accessor<number>;
  maxWithDefault: Accessor<number>;
  disabled: Accessor<boolean>;
  readOnly: Accessor<boolean>;
  id: Accessor<string | undefined>;
  setValue: (value: number | null, details: NumberFieldRoot.ChangeEventDetails) => void;
  getStepAmount: (event?: EventWithOptionalKeyState) => number | undefined;
  incrementValue: (amount: number, params: IncrementValueParameters) => void;
  refs: {
    inputRef: HTMLInputElement | null | undefined;
    allowInputSyncRef: boolean | null;
    formatOptionsRef: Intl.NumberFormatOptions | undefined;
    valueRef: number | null;
    lastChangedValueRef: number | null;
    hasPendingCommitRef: boolean;
    isPressedRef: boolean | null;
    movesAfterTouchRef: number | null;
  };
  intentionalTouchCheckTimeout: Timeout;
  name: Accessor<string | undefined>;
  required: Accessor<boolean>;
  invalid: Accessor<boolean | undefined>;
  inputMode: Accessor<InputMode>;
  getAllowedNonNumericKeys: () => Set<string | undefined>;
  min: Accessor<number | undefined>;
  max: Accessor<number | undefined>;
  setInputValue: (nextInputValue: string) => void;
  locale: Accessor<Intl.LocalesArgument>;
  isScrubbing: Accessor<boolean>;
  setIsScrubbing: Setter<boolean>;
  state: NumberFieldRoot.State;
  onValueCommitted: (
    value: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) => void;
}

export const NumberFieldRootContext = createContext<NumberFieldRootContext>();

export function useNumberFieldRootContext() {
  const context = useContext(NumberFieldRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: NumberFieldRootContext is missing. NumberField parts must be placed within <NumberField.Root>.',
    );
  }

  return context;
}
