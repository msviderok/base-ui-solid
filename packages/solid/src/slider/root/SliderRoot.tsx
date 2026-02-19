import { ownerDocument } from '@base-ui/utils/owner';
import { warn } from '@base-ui/utils/warn';
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  mergeProps as solidMergeProps,
} from 'solid-js';
import { CompositeList, type CompositeMetadata } from '../../composite/list/CompositeList';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useField } from '../../field/useField';
import { activeElement } from '../../floating-ui-solid/utils';
import { useFormContext } from '../../form/FormContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { splitComponentProps } from '../../solid-helpers';
import { areArraysEqual } from '../../utils/areArraysEqual';
import { clamp } from '../../utils/clamp';
import {
  createChangeEventDetails,
  createGenericEventDetails,
  type BaseUIChangeEventDetails,
  type BaseUIGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, Orientation } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import type { ThumbMetadata } from '../thumb/SliderThumb';
import { asc } from '../utils/asc';
import { getSliderValue } from '../utils/getSliderValue';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';
import { SliderRootContext } from './SliderRootContext';
import { sliderStateAttributesMapping } from './stateAttributesMapping';

function getSliderChangeEventReason(
  event: KeyboardEvent | InputEvent,
): SliderRootChangeEventReason {
  return 'key' in event ? REASONS.keyboard : REASONS.inputChange;
}

function areValuesEqual(
  newValue: number | readonly number[],
  oldValue: number | readonly number[],
) {
  if (typeof newValue === 'number' && typeof oldValue === 'number') {
    return newValue === oldValue;
  }
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    return areArraysEqual(newValue, oldValue);
  }
  return false;
}

/**
 * Groups all parts of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderRoot<Value extends number | readonly number[]>(
  componentProps: SliderRoot.Props<Value>,
) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'aria-labelledby',
    'defaultValue',
    'disabled',
    'id',
    'format',
    'largeStep',
    'locale',
    'max',
    'min',
    'minStepsBetweenValues',
    'name',
    'onValueChange',
    'onValueCommitted',
    'orientation',
    'step',
    'thumbCollisionBehavior',
    'thumbAlignment',
    'value',
  ]);
  const ariaLabelledByProp = () => local['aria-labelledby'];
  const disabledProp = () => local.disabled ?? false;
  const idProp = () => local.id;
  const largeStep = () => local.largeStep ?? 10;
  const max = () => local.max ?? 100;
  const min = () => local.min ?? 0;
  const minStepsBetweenValues = () => local.minStepsBetweenValues ?? 0;
  const nameProp = () => local.name;
  const orientation = () => local.orientation ?? 'horizontal';
  const step = () => local.step ?? 1;
  const thumbCollisionBehavior = () => local.thumbCollisionBehavior ?? 'push';
  const thumbAlignment = () => local.thumbAlignment ?? 'center';
  const valueProp = () => local.value;

  const id = useBaseUiId(idProp);
  const onValueChange = local.onValueChange as (
    value: number | number[],
    eventDetails: SliderRoot.ChangeEventDetails,
  ) => void;
  const onValueCommitted = local.onValueCommitted as (
    value: number | readonly number[],
    eventDetails: SliderRoot.CommitEventDetails,
  ) => void;

  const { clearErrors } = useFormContext();
  const {
    state: fieldState,
    disabled: fieldDisabled,
    name: fieldName,
    setTouched,
    setDirty,
    validityData,
    shouldValidateOnChange,
    validation,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();

  const ariaLabelledby = () => ariaLabelledByProp() ?? labelId();
  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();

  // The internal value is potentially unsorted, e.g. to support frozen arrays
  // https://github.com/mui/material-ui/pull/28472
  const [valueUnwrapped, setValueUnwrapped] = useControlled({
    controlled: valueProp,
    default: () => local.defaultValue ?? min(),
    name: 'Slider',
  });

  let sliderRef = null as HTMLElement | null | undefined;
  const refs: SliderRootContext['refs'] = {
    controlRef: null,
    thumbRefs: [],
    // The input element nested in the pressed thumb.
    pressedInputRef: null,
    // The px distance between the pointer and the center of a pressed thumb.
    pressedThumbCenterOffsetRef: null,
    // The index of the pressed thumb, or the closest thumb if the `Control` was pressed.
    // This is updated on pointerdown, which is sooner than the `active/activeIndex`
    // state which is updated later when the nested `input` receives focus.
    pressedThumbIndexRef: -1,
    // The values when the current drag interaction started.
    pressedValuesRef: null,
    lastChangedValueRef: null,
    lastChangeReasonRef: 'none',
    formatOptionsRef: local.format,
  };

  // We can't use the :active browser pseudo-classes.
  // - The active state isn't triggered when clicking on the rail.
  // - The active state isn't transferred when inversing a range slider.
  const [active, setActiveState] = createSignal(-1);
  const [lastUsedThumbIndex, setLastUsedThumbIndex] = createSignal(-1);
  const [dragging, setDragging] = createSignal(false);
  const [thumbArray, setThumbArray] = createSignal<
    Array<{ element: Element; metadata: CompositeMetadata<ThumbMetadata> | null }>
  >([]);
  const [indicatorPosition, setIndicatorPosition] = createSignal<(number | undefined)[]>([
    undefined,
    undefined,
  ]);

  const setActive = (value: number) => {
    batch(() => {
      setActiveState(value);

      if (value !== -1) {
        setLastUsedThumbIndex(value);
      }
    });
  };

  useField({
    id,
    commit: validation.commit,
    value: valueUnwrapped,
    controlRef: refs.controlRef,
    name,
    getValue: valueUnwrapped,
  });

  createEffect(
    on(valueUnwrapped, () => {
      clearErrors(name());

      const val = valueUnwrapped();

      if (shouldValidateOnChange()) {
        validation.commit(val);
      } else {
        validation.commit(val, true);
      }

      const initialValue = validityData.initialValue as Value | undefined;
      let isDirty: boolean;
      if (Array.isArray(val) && Array.isArray(initialValue)) {
        isDirty = !areArraysEqual(val, initialValue);
      } else {
        isDirty = val !== initialValue;
      }
      setDirty(isDirty);
    }),
  );

  const registerFieldControlRef = (element: HTMLElement | null | undefined) => {
    if (element) {
      refs.controlRef = element;
    }
  };

  const range = () => Array.isArray(valueUnwrapped());

  const values = createMemo(() => {
    if (!range()) {
      return [clamp(valueUnwrapped() as number, min(), max())];
    }
    return (valueUnwrapped() as unknown as Array<number>).slice().sort(asc);
  });

  const setValue = (newValue: number | number[], details?: SliderRoot.ChangeEventDetails) => {
    if (Number.isNaN(newValue) || areValuesEqual(newValue, valueUnwrapped())) {
      return;
    }

    const changeDetails =
      details ??
      createChangeEventDetails(REASONS.none, undefined, undefined, { activeThumbIndex: -1 });

    refs.lastChangeReasonRef = changeDetails.reason;

    // Redefine target to allow name and value to be read.
    // This allows seamless integration with the most popular form libraries.
    // https://github.com/mui/material-ui/issues/13485#issuecomment-676048492
    // Clone the event to not override `target` of the original event.
    const nativeEvent = changeDetails.event;
    const EventConstructor = (nativeEvent.constructor as typeof Event | undefined) ?? Event;
    const clonedEvent = new EventConstructor(nativeEvent.type, nativeEvent);

    Object.defineProperty(clonedEvent, 'target', {
      writable: true,
      value: { value: newValue, name: name() },
    });

    changeDetails.event = clonedEvent;

    refs.lastChangedValueRef = newValue;

    onValueChange(newValue, changeDetails);

    if (changeDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(() => newValue as Value);
  };

  const handleInputChange = (
    valueInput: number,
    index: number,
    event: KeyboardEvent | InputEvent,
  ) => {
    const newValue = getSliderValue(valueInput, index, min(), max(), range(), values());

    if (validateMinimumDistance(newValue, step(), minStepsBetweenValues())) {
      const reason = getSliderChangeEventReason(event);
      setValue(
        newValue,
        createChangeEventDetails(reason, event, undefined, {
          activeThumbIndex: index,
        }),
      );
      setTouched(true);

      const nextValue = refs.lastChangedValueRef ?? newValue;
      onValueCommitted(nextValue, createGenericEventDetails(reason, event));
    }
  };

  if (process.env.NODE_ENV !== 'production') {
    createEffect(
      on([min, max, dragging, valueProp], ([minVal, maxVal]) => {
        if (minVal >= maxVal) {
          warn('Slider `max` must be greater than `min`.');
        }
      }),
    );
  }

  createEffect(() => {
    const activeEl = activeElement(ownerDocument(sliderRef ?? null));
    if (disabled() && activeEl && sliderRef?.contains(activeEl)) {
      // This is necessary because Firefox and Safari will keep focus
      // on a disabled element:
      // https://codesandbox.io/p/sandbox/mui-pr-22247-forked-h151h?file=/src/App.js
      (activeEl as HTMLElement).blur();
    }
  });

  createEffect(() => {
    if (disabled() && active() !== -1) {
      setActive(-1);
    }
  });

  const state: SliderRoot.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
    get activeThumbIndex() {
      return active();
    },
    get dragging() {
      return dragging();
    },
    get orientation() {
      return orientation();
    },
    get max() {
      return max();
    },
    get min() {
      return min();
    },
    get minStepsBetweenValues() {
      return minStepsBetweenValues();
    },
    get step() {
      return step();
    },
    get values() {
      return values();
    },
  });

  const contextValue: SliderRootContext = {
    active,
    disabled,
    dragging,
    validation,
    refs,
    handleInputChange,
    indicatorPosition,
    inset: () => thumbAlignment() !== 'center',
    labelId: ariaLabelledby,
    largeStep,
    lastUsedThumbIndex,
    locale: () => local.locale,
    max,
    min,
    minStepsBetweenValues,
    name,
    onValueCommitted,
    orientation,
    registerFieldControlRef,
    renderBeforeHydration: () => thumbAlignment() === 'edge',
    setActive,
    setDragging,
    setIndicatorPosition,
    setValue,
    state,
    step,
    thumbCollisionBehavior,
    thumbArray,
    values,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      sliderRef = el;
    },
    props: [
      {
        get 'aria-labelledby'() {
          return ariaLabelledby();
        },
        get id() {
          return id();
        },
        role: 'group',
      },
      validation.getValidationProps,
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return (
    <SliderRootContext.Provider value={contextValue}>
      <CompositeList refs={{ elements: refs.thumbRefs }} onMapChange={setThumbArray}>
        {element()}
      </CompositeList>
    </SliderRootContext.Provider>
  );
}

export interface SliderRootState extends FieldRoot.State {
  /**
   * The index of the active thumb.
   */
  activeThumbIndex: number;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the thumb is currently being dragged.
   */
  dragging: boolean;
  max: number;
  min: number;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues: number;
  /**
   * The component orientation.
   */
  orientation: Orientation;
  /**
   * The step increment of the slider when incrementing or decrementing. It will snap
   * to multiples of this value. Decimal values are supported.
   * @default 1
   */
  step: number;
  /**
   * The raw number value of the slider.
   */
  values: readonly number[];
}

export interface SliderRootProps<
  Value extends number | readonly number[] = number | readonly number[],
> extends BaseUIComponentProps<'div', SliderRoot.State> {
  /**
   * The uncontrolled value of the slider when it’s initially rendered.
   *
   * To render a controlled slider, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Whether the slider should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Options to format the input value.
   */
  format?: Intl.NumberFormatOptions | undefined;
  /**
   * The locale used by `Intl.NumberFormat` when formatting the value.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The maximum allowed value of the slider.
   * Should not be equal to min.
   * @default 100
   */
  max?: number | undefined;
  /**
   * The minimum allowed value of the slider.
   * Should not be equal to max.
   * @default 0
   */
  min?: number | undefined;
  /**
   * The minimum steps between values in a range slider.
   * @default 0
   */
  minStepsBetweenValues?: number | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * The component orientation.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
  /**
   * The granularity with which the slider can step through values. (A "discrete" slider.)
   * The `min` prop serves as the origin for the valid values.
   * We recommend (max - min) to be evenly divisible by the step.
   * @default 1
   */
  step?: number | undefined;
  /**
   * The granularity with which the slider can step through values when using Page Up/Page Down or Shift + Arrow Up/Arrow Down.
   * @default 10
   */
  largeStep?: number | undefined;
  /**
   * How the thumb(s) are aligned relative to `Slider.Control` when the value is at `min` or `max`:
   * - `center`: The center of the thumb is aligned with the control edge
   * - `edge`: The thumb is inset within the control such that its edge is aligned with the control edge
   * - `edge-client-only`: Same as `edge` but renders after React hydration on the client, reducing bundle size in return
   * @default 'center'
   */
  thumbAlignment?: ('center' | 'edge' | 'edge-client-only') | undefined;
  /**
   * Controls how thumbs behave when they collide during pointer interactions.
   *
   * - `'push'` (default): Thumbs push each other without restoring their previous positions when dragged back.
   * - `'swap'`: Thumbs swap places when dragged past each other.
   * - `'none'`: Thumbs cannot move past each other; excess movement is ignored.
   *
   * @default 'push'
   */
  thumbCollisionBehavior?: ('push' | 'swap' | 'none') | undefined;
  /**
   * The value of the slider.
   * For ranged sliders, provide an array with two values.
   */
  value?: Value | undefined;
  /**
   * Callback function that is fired when the slider's value changed.
   * You can pull out the new value by accessing `event.target.value` (any).
   *
   * The `eventDetails.reason` indicates what triggered the change:
   *
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'track-press'` when the control track is pressed
   * - `'drag'` while dragging a thumb
   * - `'keyboard'` for keyboard input
   * - `'none'` when the change is triggered without a specific interaction
   */
  onValueChange?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.ChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Callback function that is fired when the `pointerup` is triggered.
   * **Warning**: This is a generic event not a change event.
   *
   * The `eventDetails.reason` indicates what triggered the commit:
   *
   * - `'drag'` while dragging a thumb
   * - `'track-press'` when the control track is pressed
   * - `'keyboard'` for keyboard input
   * - `'input-change'` when the hidden range input emits a change event (for example, via form integration)
   * - `'none'` when the commit occurs without a specific interaction
   */
  onValueCommitted?:
    | ((
        value: Value extends number ? number : Value,
        eventDetails: SliderRoot.CommitEventDetails,
      ) => void)
    | undefined;
}

export interface SliderRootChangeEventCustomProperties {
  /**
   * The index of the active thumb at the time of the change.
   */
  activeThumbIndex: number;
}

export type SliderRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootChangeEventDetails = BaseUIChangeEventDetails<
  SliderRoot.ChangeEventReason,
  SliderRootChangeEventCustomProperties
>;

export type SliderRootCommitEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.trackPress
  | typeof REASONS.drag
  | typeof REASONS.keyboard
  | typeof REASONS.none;
export type SliderRootCommitEventDetails = BaseUIGenericEventDetails<SliderRoot.CommitEventReason>;

export namespace SliderRoot {
  export type State = SliderRootState;
  export type Props<Value extends number | readonly number[] = number | readonly number[]> =
    SliderRootProps<Value>;
  export type ChangeEventReason = SliderRootChangeEventReason;
  export type ChangeEventDetails = SliderRootChangeEventDetails;
  export type CommitEventReason = SliderRootCommitEventReason;
  export type CommitEventDetails = SliderRootCommitEventDetails;
}
