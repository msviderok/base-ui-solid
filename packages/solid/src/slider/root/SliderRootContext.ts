import { createContext, useContext, type Accessor, type Setter } from 'solid-js';
import type { CompositeMetadata } from '../../composite/list/CompositeList';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import type { Orientation } from '../../utils/types';
import type { ThumbMetadata } from '../thumb/SliderThumb';
import type { SliderRoot } from './SliderRoot';

export interface SliderRootContext {
  /**
   * The index of the active thumb.
   */
  active: Accessor<number>;
  /**
   * The index of the most recently interacted thumb.
   */
  lastUsedThumbIndex: Accessor<number>;
  dragging: Accessor<boolean>;
  disabled: Accessor<boolean>;
  validation: UseFieldValidationReturnValue;
  refs: {
    controlRef: HTMLElement | null | undefined;
    formatOptionsRef: Intl.NumberFormatOptions | undefined;
    lastChangedValueRef: number | readonly number[] | null;
    lastChangeReasonRef: SliderRoot.ChangeEventReason;
    pressedInputRef: HTMLInputElement | null | undefined;
    pressedThumbCenterOffsetRef: number | null;
    pressedThumbIndexRef: number;
    pressedValuesRef: readonly number[] | null;
    thumbRefs: (HTMLElement | null)[];
  };
  handleInputChange: (valueInput: number, index: number, event: KeyboardEvent | InputEvent) => void;
  indicatorPosition: Accessor<(number | undefined)[]>;
  inset: Accessor<boolean>;
  labelId: Accessor<string | undefined>;
  /**
   * The large step value of the slider when incrementing or decrementing while the shift key is held,
   * or when using Page-Up or Page-Down keys. Snaps to multiples of this value.
   * @default 10
   */
  largeStep: Accessor<number>;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale: Accessor<Intl.LocalesArgument | undefined>;
  /**
   * The maximum allowed value of the slider.
   */
  max: Accessor<number>;
  /**
   * The minimum allowed value of the slider.
   */
  min: Accessor<number>;
  /**
   * The minimum steps between values in a range slider.
   */
  minStepsBetweenValues: Accessor<number>;
  name: Accessor<string | undefined>;
  /**
   * Function to be called when drag ends and the pointer is released.
   */
  onValueCommitted: (
    newValue: number | readonly number[],
    data: SliderRoot.CommitEventDetails,
  ) => void;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation: Accessor<Orientation>;
  renderBeforeHydration: Accessor<boolean>;
  registerFieldControlRef: (element: HTMLElement | null | undefined) => void;
  setActive: (index: number) => void;
  setDragging: (dragging: boolean) => void;
  setIndicatorPosition: Setter<(number | undefined)[]>;
  /**
   * Callback fired when dragging and invokes onValueChange.
   */
  setValue: (newValue: number | number[], details?: SliderRoot.ChangeEventDetails) => void;
  state: SliderRoot.State;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: Accessor<number>;
  thumbCollisionBehavior: Accessor<'push' | 'swap' | 'none'>;
  thumbArray: Accessor<
    Array<{ element: Element; metadata: CompositeMetadata<ThumbMetadata> | null }>
  >;
  /**
   * The value(s) of the slider
   */
  values: Accessor<readonly number[]>;
}

export const SliderRootContext = createContext<SliderRootContext | undefined>(undefined);

export function useSliderRootContext() {
  const context = useContext(SliderRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: SliderRootContext is missing. Slider parts must be placed within <Slider.Root>.',
    );
  }
  return context;
}
