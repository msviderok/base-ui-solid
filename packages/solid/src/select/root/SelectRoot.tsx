import { createEffect, createMemo, For, on, onMount, Show, type JSX } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useField } from '../../field/useField';
import {
  useClick,
  useDismiss,
  useFloatingRootContext,
  useInteractions,
  useListNavigation,
  useTypeahead,
} from '../../floating-ui-solid';
import { useFormContext } from '../../form/FormContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { mergeProps } from '../../merge-props';
import { useRef, type ReactLikeRef } from '../../solid-helpers';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../../utils/constants';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { defaultItemEquality, findItemIndex } from '../../utils/itemEquality';
import { REASONS } from '../../utils/reasons';
import { stringifyAsValue } from '../../utils/resolveValueLabel';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import { useControlled } from '../../utils/useControlled';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { useTransitionStatus } from '../../utils/useTransitionStatus';
import { visuallyHidden, visuallyHiddenInput } from '../../utils/visuallyHidden';
import { selectors, type State as StoreState } from '../store';
import { SelectFloatingContext, SelectRootContext } from './SelectRootContext';

/**
 * Groups all parts of the select.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectRoot<Value, Multiple extends boolean | undefined = false>(
  props: SelectRoot.Props<Value, Multiple>,
): JSX.Element {
  const valueProp = () => props.value;
  const defaultValue = () => props.defaultValue ?? null;
  const openProp = () => props.open;
  const defaultOpen = () => props.defaultOpen ?? false;
  const nameProp = () => props.name;
  const disabledProp = () => props.disabled ?? false;
  const readOnly = () => props.readOnly ?? false;
  const required = () => props.required ?? false;
  const modal = () => props.modal ?? true;
  const multiple = () => props.multiple ?? false;
  const isItemEqualToValue: typeof defaultItemEquality = (...args) =>
    (props.isItemEqualToValue ?? defaultItemEquality)(...args);
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;

  const { clearErrors } = useFormContext();
  const {
    setDirty,
    setTouched,
    setFocused,
    shouldValidateOnChange,
    validityData,
    setFilled,
    name: fieldName,
    disabled: fieldDisabled,
    validation,
    validationMode,
  } = useFieldRootContext();

  const generatedId = useLabelableId({ id: () => props.id });

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();

  const [value, setValueUnwrapped] = useControlled({
    controlled: valueProp,
    default: () =>
      multiple() ? (defaultValue() ?? ([] as ReturnType<typeof defaultValue>)) : defaultValue(),
    name: 'Select',
    state: 'value',
  });

  const [open, setOpenUnwrapped] = useControlled({
    controlled: openProp,
    default: defaultOpen,
    name: 'Select',
    state: 'open',
  });

  const listRef = useRef<Array<HTMLElement | null | undefined>>([]);
  const labelsRef = useRef<Array<string | null>>([]);
  const popupRef = useRef<HTMLDivElement | null | undefined>(null);
  const scrollHandlerRef = useRef<((el: HTMLDivElement) => void) | null>(null);
  const scrollArrowsMountedCountRef = useRef(0);
  const valueRef = useRef<HTMLSpanElement | null | undefined>(null);
  const valuesRef = useRef<Array<any>>([]);
  const typingRef = useRef(false);
  const keyboardActiveRef = useRef(false);
  const selectedItemTextRef = useRef<HTMLSpanElement | null | undefined>(null);
  const selectionRef = useRef({
    allowSelectedMouseUp: false,
    allowUnselectedMouseUp: false,
  });
  const alignItemWithTriggerActiveRef = useRef(false);
  const triggerPressedRef = useRef(false);
  const lastCloseReasonRef = useRef<SelectRoot.ChangeEventReason | null>(null);

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open);
  const {
    openMethod,
    triggerProps: interactionTypeProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  const store = SolidStore<StoreState, Record<string, never>, typeof selectors>(
    {
      get id() {
        return generatedId();
      },
      get modal() {
        return modal();
      },
      get multiple() {
        return multiple();
      },
      get itemToStringLabel() {
        return props.itemToStringLabel;
      },
      get itemToStringValue() {
        return props.itemToStringValue;
      },
      isItemEqualToValue,
      get value() {
        return value();
      },
      get open() {
        return open();
      },
      get mounted() {
        return mounted();
      },
      get transitionStatus() {
        return transitionStatus();
      },
      get items() {
        return props.items;
      },
      forceMount: false,
      openMethod: null,
      activeIndex: null,
      selectedIndex: null,
      popupProps: {},
      triggerProps: {},
      triggerElement: null,
      positionerElement: null,
      listElement: null,
      scrollUpArrowVisible: false,
      scrollDownArrowVisible: false,
      hasScrollArrows: false,
    },
    {},
    selectors,
  );

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const triggerElement = store.useState('triggerElement');
  const positionerElement = store.useState('positionerElement');

  const serializedValue = createMemo(() => {
    const val = value();
    if (multiple() && Array.isArray(val) && val.length === 0) {
      return '';
    }
    return stringifyAsValue(val, props.itemToStringValue);
  });

  const fieldStringValue = createMemo(() => {
    const val = value();
    if (multiple() && Array.isArray(val)) {
      return val.map((currentValue) => stringifyAsValue(currentValue, props.itemToStringValue));
    }
    return stringifyAsValue(val, props.itemToStringValue);
  });

  // ––– AI-GENERATED FIX AND EXPLANATION –––
  // React validation receives the raw selected value directly from state.
  // In Solid, values can cross signal/store boundaries as proxies, so we unwrap them before
  // validation and autofill bookkeeping to keep equality checks and field serialization stable.
  const fieldRawValue = createMemo(() => unwrap(value()));

  useField({
    id: generatedId,
    commit: validation.commit,
    value: fieldRawValue,
    controlRef: () => store.state.triggerElement,
    name,
    getValue: fieldStringValue,
  });

  const initialValueRef = useRef(value());
  createEffect(() => {
    // Ensure the values and labels are registered for programmatic value changes.
    if (value() !== initialValueRef.current) {
      store.set('forceMount', true);
    }
  });

  createEffect(() => {
    // ––– AI-GENERATED FIX AND EXPLANATION –––
    // React naturally clears this bookkeeping as the popup rerenders around a null single value.
    // In Solid, the previous selected index can survive longer because setup does not rerun,
    // so we clear it explicitly when an empty single-select opens.
    if (open() && !multiple() && value() == null) {
      store.set('selectedIndex', null);
    }
  });

  createEffect(() => {
    const val = value();
    setFilled(multiple() ? Array.isArray(val) && val.length > 0 : val != null);
  });

  createEffect(() => {
    if (open()) {
      return;
    }

    const registry = valuesRef.current;

    if (multiple()) {
      const val = value();
      const currentValue = Array.isArray(val) ? val : [];
      if (currentValue.length === 0) {
        store.set('selectedIndex', null);
        return;
      }

      const lastValue = currentValue[currentValue.length - 1];
      const lastIndex = findItemIndex(registry, lastValue, isItemEqualToValue);
      store.set('selectedIndex', lastIndex === -1 ? null : lastIndex);
      return;
    }

    const index = findItemIndex(registry, value() as Value, isItemEqualToValue);
    store.set('selectedIndex', index === -1 ? null : index);
  });

  createEffect(
    on(
      value,
      () => {
        clearErrors(name());
        setDirty(value() !== initialValueRef.current);

        if (shouldValidateOnChange()) {
          validation.commit(fieldRawValue());
        } else {
          validation.commit(fieldRawValue(), true);
        }
      },
      { defer: true },
    ),
  );

  const handleUnmount = () => {
    setOpenUnwrapped(false);
    setMounted(false);
    store.set('activeIndex', null);
    resetOpenInteractionType();
    props.onOpenChangeComplete?.(false);
  };

  const setOpen = (nextOpen: boolean, eventDetails: SelectRoot.ChangeEventDetails) => {
    if (nextOpen !== open()) {
      lastCloseReasonRef.current = nextOpen ? null : eventDetails.reason;
    }

    props.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setOpenUnwrapped(nextOpen);

    if (
      !nextOpen &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      setTouched(true);
      setFocused(false);

      if (validationMode() === 'onBlur') {
        validation.commit(fieldRawValue());
      }
    }

    // The active index will sync to the last selected index on the next open.
    // Workaround `enableFocusInside` in Floating UI setting `tabindex=0` of a non-highlighted
    // option upon close when tabbing out due to `keepMounted=true`:
    // https://github.com/floating-ui/floating-ui/pull/3004/files#diff-962a7439cdeb09ea98d4b622a45d517bce07ad8c3f866e089bda05f4b0bbd875R194-R199
    // This otherwise causes options to retain `tabindex=0` incorrectly when the popup is closed
    // when tabbing outside.
    if (!nextOpen && store.state.activeIndex !== null) {
      const activeOption = listRef.current[store.state.activeIndex];
      // Wait for Floating UI's focus effect to have fired
      queueMicrotask(() => {
        activeOption?.setAttribute('tabindex', '-1');
      });
    }

    if (!nextOpen && !props.actionsRef && popupRef.current == null) {
      // ––– AI-GENERATED FIX AND EXPLANATION –––
      // The normal close path waits for the popup element to finish its exit transition before
      // clearing `mounted`. In this composition there is no `<Select.Popup>`, so no popup ref ever
      // exists and the completion hook has nothing to observe. We fall back to the same unmount
      // cleanup immediately instead of leaving the positioner mounted forever.
      handleUnmount();
    }
  };

  useOpenChangeComplete({
    enabled: () => !props.actionsRef,
    open,
    ref: () => popupRef.current,
    onComplete() {
      if (!open()) {
        handleUnmount();
      }
    },
  });

  onMount(() => {
    if (props.actionsRef) {
      props.actionsRef.current = { unmount: handleUnmount };
    }
  });

  const setValue = (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => {
    props.onValueChange?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(nextValue);
    setDirty(nextValue !== initialValueRef.current);
  };

  const handleScrollArrowVisibility = () => {
    const scroller = store.state.listElement || popupRef.current;
    if (!scroller) {
      return;
    }

    const viewportTop = scroller.scrollTop;
    const viewportBottom = scroller.scrollTop + scroller.clientHeight;
    const shouldShowUp = viewportTop > 1;
    const shouldShowDown = viewportBottom < scroller.scrollHeight - 1;

    if (store.state.scrollUpArrowVisible !== shouldShowUp) {
      store.set('scrollUpArrowVisible', shouldShowUp);
    }
    if (store.state.scrollDownArrowVisible !== shouldShowDown) {
      store.set('scrollDownArrowVisible', shouldShowDown);
    }
  };

  const floatingContext = useFloatingRootContext({
    get open() {
      return open();
    },
    onOpenChange(nextOpen, eventDetails) {
      setOpen(nextOpen, eventDetails as SelectRoot.ChangeEventDetails);
    },
    elements: {
      get reference() {
        return triggerElement();
      },
      get floating() {
        return positionerElement();
      },
    },
  });

  createEffect(() => {
    const ref = triggerElement();

    if (
      ref !== undefined &&
      floatingContext.state.floatingElement == null &&
      floatingContext.state.positionReference === floatingContext.state.referenceElement
    ) {
      floatingContext.update({ positionReference: ref });
    }
  });

  const click = useClick({
    get context() {
      return floatingContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled();
      },
      event: 'mousedown',
    },
  });

  const dismiss = useDismiss({
    get context() {
      return floatingContext;
    },
    props: {
      bubbles: false,
    },
  });

  const listNavigation = useListNavigation({
    get context() {
      return floatingContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled();
      },
      get listRef() {
        return listRef.current;
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      disabledIndices: EMPTY_ARRAY as number[],
      onNavigate(nextActiveIndex) {
        // Retain the highlight while transitioning out.
        if (nextActiveIndex === null && !open()) {
          return;
        }

        store.set('activeIndex', nextActiveIndex);
      },
      // Implement our own listeners since `onPointerLeave` on each option fires while scrolling with
      // the `alignItemWithTrigger=true`, causing a performance issue on Chrome.
      focusItemOnHover: false,
    },
  });

  const typeahead = useTypeahead({
    get context() {
      return floatingContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled() && (open() || !multiple());
      },
      get listRef() {
        return labelsRef.current;
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onMatch(index) {
        if (open()) {
          store.set('activeIndex', index);
        } else {
          setValue(valuesRef.current[index], createChangeEventDetails('none'));
        }
      },
      onTypingChange(typing) {
        // FIXME: Floating UI doesn't support allowing space to select an item while the popup is
        // closed and the trigger isn't a native <button>.
        typingRef.current = typing;
      },
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    listNavigation,
    typeahead,
  ]);

  const mergedTriggerProps = createMemo(() =>
    mergeProps(
      getReferenceProps(),
      interactionTypeProps,
      generatedId() ? { id: generatedId() } : EMPTY_OBJECT,
    ),
  );

  onMount(() => {
    store.update({
      popupProps: getFloatingProps(),
      triggerProps: mergedTriggerProps(),
    });
  });

  createEffect(() => {
    store.update({
      id: generatedId(),
      modal: modal(),
      multiple: multiple(),
      value: value(),
      open: open(),
      mounted: mounted(),
      transitionStatus: transitionStatus(),
      popupProps: getFloatingProps(),
      triggerProps: mergedTriggerProps(),
      items: props.items,
      itemToStringLabel: props.itemToStringLabel,
      itemToStringValue: props.itemToStringValue,
      isItemEqualToValue,
      openMethod: openMethod(),
    });
  });

  const contextValue: SelectRootContext = {
    store,
    name,
    required,
    disabled,
    readOnly,
    multiple,
    // @ts-expect-error TODO: fix this
    get itemToStringLabel() {
      return props.itemToStringLabel;
    },
    get itemToStringValue() {
      return props.itemToStringValue;
    },
    highlightItemOnHover,
    setValue,
    setOpen,
    listRef,
    popupRef,
    scrollHandlerRef,
    handleScrollArrowVisibility,
    scrollArrowsMountedCountRef,
    getItemProps,
    get events() {
      return floatingContext.context.events;
    },
    valueRef,
    valuesRef,
    labelsRef,
    typingRef,
    selectionRef,
    selectedItemTextRef,
    validation,
    get onOpenChangeComplete() {
      return props.onOpenChangeComplete;
    },
    keyboardActiveRef,
    alignItemWithTriggerActiveRef,
    initialValueRef,
    lastCloseReasonRef,
    triggerPressedRef,
  };

  const hasMultipleSelection = () => {
    const val = value();
    return multiple() && Array.isArray(val) && val.length > 0;
  };

  return (
    <SelectRootContext.Provider value={contextValue}>
      <SelectFloatingContext.Provider value={floatingContext}>
        {props.children}
        <input
          {...(validation.getInputValidationProps({
            onFocus() {
              // Move focus to the trigger element when the hidden input is focused.
              store.state.triggerElement?.focus({
                // Supported in Chrome from 144 (January 2026)
                focusVisible: true,
              });
            },
            // Handle browser autofill.
            onInput(event) {
              // Workaround for https://github.com/facebook/react/issues/9023
              if (event.defaultPrevented) {
                return;
              }

              const nextValue = event.target.value;
              const details = createChangeEventDetails(REASONS.none, event);

              function handleChange() {
                if (multiple()) {
                  // Browser autofill only writes a single scalar value.
                  return;
                }

                // Handle single selection: match against registered values using serialization
                const matchingValue = valuesRef.current.find((v) => {
                  const candidate = stringifyAsValue(v, props.itemToStringValue);
                  if (candidate.toLowerCase() === nextValue.toLowerCase()) {
                    return true;
                  }
                  return false;
                });

                if (matchingValue != null) {
                  setDirty(matchingValue !== initialValueRef.current);
                  setValue(matchingValue, details);

                  if (shouldValidateOnChange()) {
                    validation.commit(matchingValue);
                  }
                }
              }

              store.set('forceMount', true);
              queueMicrotask(handleChange);
            },
          } as JSX.InputHTMLAttributes<HTMLInputElement>) as any)}
          name={multiple() ? undefined : name()}
          autoComplete={props.autoComplete}
          value={serializedValue()}
          disabled={disabled()}
          required={required() && !hasMultipleSelection()}
          readOnly={readOnly()}
          ref={(el) => {
            if (props.inputRef) {
              props.inputRef.current = el;
            }
            validation.inputRef.current = el;
          }}
          style={name() ? visuallyHiddenInput : visuallyHidden}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* hidden inputs */}
        <Show when={multiple() && Array.isArray(value()) && (value() as Value[]).length > 0}>
          <For each={value() as Value[]}>
            {(v) => (
              <input
                type="hidden"
                name={name()}
                value={stringifyAsValue(v, props.itemToStringValue)}
              />
            )}
          </For>
        </Show>
      </SelectFloatingContext.Provider>
    </SelectRootContext.Provider>
  );
}

type SelectValueType<Value, Multiple extends boolean | undefined> = Multiple extends true
  ? Value[]
  : Value;

export interface SelectRootProps<Value, Multiple extends boolean | undefined = false> {
  children?: JSX.Element;
  /**
   * A ref to access the hidden input element.
   */
  inputRef?: ReactLikeRef<HTMLInputElement | null> | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Provides a hint to the browser for autofill.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  autoComplete?: string | undefined;
  /**
   * The id of the Select.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the select popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether multiple items can be selected.
   * @default false
   */
  multiple?: Multiple | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether the select popup is initially open.
   *
   * To render a controlled select popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the select popup is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: SelectRootChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the select popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the select popup is currently open.
   */
  open?: boolean | undefined;
  /**
   * Determines if the select enters a modal state when open.
   * - `true`: user interaction is limited to the select: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the select will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the select manually.
   * Useful when the select's animation is controlled by an external library.
   */
  actionsRef?: ReactLikeRef<SelectRootActions | null> | undefined;
  /**
   * Data structure of the items rendered in the select popup.
   * When specified, `<Select.Value>` renders the label of the selected item instead of the raw value.
   * @example
   * ```tsx
   * const items = {
   *   sans: 'Sans-serif',
   *   serif: 'Serif',
   *   mono: 'Monospace',
   *   cursive: 'Cursive',
   * };
   * <Select.Root items={items} />
   * ```
   */
  items?:
    | (Record<string, JSX.Element> | ReadonlyArray<{ label: JSX.Element; value: any }>)
    | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for display in the trigger.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   */
  itemToStringLabel?: ((itemValue: Value) => string) | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   */
  itemToStringValue?: ((itemValue: Value) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a select item value matches the current selected value. Useful when item values are objects without matching referentially.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: Value, value: Value) => boolean) | undefined;
  /**
   * The uncontrolled value of the select when it’s initially rendered.
   *
   * To render a controlled select, use the `value` prop instead.
   */
  defaultValue?: (SelectValueType<Value, Multiple> | null) | undefined;
  /**
   * The value of the select. Use when controlled.
   */
  value?: (SelectValueType<Value, Multiple> | null) | undefined;
  /**
   * Event handler called when the value of the select changes.
   */
  onValueChange?:
    | ((
        value: SelectValueType<Value, Multiple> | (Multiple extends true ? never : null),
        eventDetails: SelectRootChangeEventDetails,
      ) => void)
    | undefined;
}

export interface SelectRootState {}

export interface SelectRootActions {
  unmount: () => void;
}

export type SelectRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.windowResize
  | typeof REASONS.itemPress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.cancelOpen
  | typeof REASONS.none;

export type SelectRootChangeEventDetails = BaseUIChangeEventDetails<SelectRootChangeEventReason>;

export namespace SelectRoot {
  export type Props<Value, Multiple extends boolean | undefined = false> = SelectRootProps<
    Value,
    Multiple
  >;
  export type State = SelectRootState;
  export type Actions = SelectRootActions;
  export type ChangeEventReason = SelectRootChangeEventReason;
  export type ChangeEventDetails = SelectRootChangeEventDetails;
}
