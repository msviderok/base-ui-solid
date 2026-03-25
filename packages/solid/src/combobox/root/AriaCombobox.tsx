/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
  untrack,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useField } from '../../field/useField';
import {
  ElementProps,
  useClick,
  useDismiss,
  useFloatingRootContext,
  useInteractions,
  useListNavigation,
} from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import { useFormContext } from '../../form/FormContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { type ReactLikeRef } from '../../solid-helpers';
import { EMPTY_ARRAY } from '../../utils/constants';
import {
  createChangeEventDetails,
  createGenericEventDetails,
  type BaseUIChangeEventDetails,
  type BaseUIGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import {
  compareItemEquality,
  defaultItemEquality,
  findItemIndex,
  removeItem,
  selectedValueIncludes,
} from '../../utils/itemEquality';
import { NOOP } from '../../utils/noop';
import { REASONS } from '../../utils/reasons';
import {
  Group,
  isGroupedItems,
  stringifyAsLabel,
  stringifyAsValue,
} from '../../utils/resolveValueLabel';
import { HTMLProps } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { useTransitionStatus } from '../../utils/useTransitionStatus';
import { visuallyHidden, visuallyHiddenInput } from '../../utils/visuallyHidden';
import { createComboboxStore } from '../store';
import {
  ComboboxDerivedItemsContext,
  ComboboxFloatingContext,
  ComboboxInputValueContext,
  ComboboxRootContext,
} from './ComboboxRootContext';
import { createCollatorItemFilter, createSingleSelectionCollatorFilter } from './utils';
import { INITIAL_LAST_HIGHLIGHT, NO_ACTIVE_VALUE } from './utils/constants';
import { useCoreFilter } from './utils/useFilter';

/**
 * @internal
 */
export function AriaCombobox<Value, Mode extends SelectionMode = 'none'>(
  props: Omit<AriaComboboxProps<Value, Mode>, 'items'> & {
    items: readonly Group<any>[];
  },
): JSX.Element;
export function AriaCombobox<Value, Mode extends SelectionMode = 'none'>(
  props: Omit<AriaComboboxProps<Value, Mode>, 'items'> & {
    items?: readonly any[] | undefined;
  },
): JSX.Element;
export function AriaCombobox<Value = any, Mode extends SelectionMode = 'none'>(
  props: AriaComboboxProps<Value, Mode>,
): JSX.Element {
  const idProp = () => props.id;
  const defaultSelectedValue = () => props.defaultSelectedValue ?? null;
  const selectedValueProp = () => props.selectedValue;
  const defaultInputValueProp = () => props.defaultInputValue;
  const inputValueProp = () => props.inputValue;
  const selectionMode = () => props.selectionMode ?? 'none';
  const nameProp = () => props.name;
  const disabledProp = () => props.disabled ?? false;
  const readOnly = () => props.readOnly ?? false;
  const required = () => props.required ?? false;
  const grid = () => props.grid ?? false;
  const filteredItemsProp = () => props.filteredItems;
  const openOnInputClick = () => props.openOnInputClick ?? true;
  const autoHighlight = () => props.autoHighlight ?? false;
  const keepHighlight = () => props.keepHighlight ?? false;
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;
  const loopFocus = () => props.loopFocus ?? true;
  const isItemEqualToValue: typeof props.isItemEqualToValue = (...args) =>
    (props.isItemEqualToValue ?? defaultItemEquality)(...args);
  const virtualized = () => props.virtualized ?? false;
  const inlineProp = () => props.inline ?? false;
  const fillInputOnItemPress = () => props.fillInputOnItemPress ?? true;
  const modal = () => props.modal ?? false;
  const limit = () => props.limit ?? -1;
  const autoComplete = () => props.autoComplete ?? 'list';
  const submitOnItemClick = () => props.submitOnItemClick ?? false;

  const { clearErrors } = useFormContext();
  const {
    setDirty,
    validityData,
    shouldValidateOnChange,
    setFilled,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setFocused,
    validationMode,
    validation,
  } = useFieldRootContext();

  const id = useLabelableId({ id: idProp });
  const collatorFilter = useCoreFilter({
    get locale() {
      return props.locale;
    },
  });

  const [queryChangedAfterOpen, setQueryChangedAfterOpen] = createSignal(false);
  const [closeQuery, setCloseQuery] = createSignal<string | null>(null);

  const listRef = [] as Array<HTMLElement | null | undefined>;
  const popupRef = null as HTMLDivElement | null | undefined;
  const inputRef = null as HTMLInputElement | null | undefined;
  const emptyRef = null as HTMLDivElement | null | undefined;
  const keyboardActiveRef = true;
  const chipsContainerRef = null as HTMLDivElement | null | undefined;
  const clearRef = null as HTMLButtonElement | null | undefined;

  const labelsRef = [] as Array<string | null>;
  let hadInputClearRef = false;
  let selectionEventRef = null as MouseEvent | PointerEvent | KeyboardEvent | null;
  let lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
  let pendingQueryHighlightRef = null as null | { hasQuery: boolean };

  /**
   * Contains the currently visible list of item values post-filtering.
   */
  const valuesRef = [] as any[];
  /**
   * Contains all item values in a stable, unfiltered order.
   * This is only used when `items` prop is not provided.
   * It accumulates values on first mount and does not remove them on unmount due to
   * filtering, providing a stable index for selected value tracking.
   */
  const allValuesRef = [] as any[];

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();
  const multiple = () => selectionMode() === 'multiple';
  const single = () => selectionMode() === 'single';
  const hasInputValue = () =>
    inputValueProp() !== undefined || defaultInputValueProp() !== undefined;
  const hasItems = () => props.items !== undefined;
  const hasFilteredItemsProp = () => filteredItemsProp() !== undefined;

  const autoHighlightMode = createMemo<false | 'input-change' | 'always'>(() => {
    if (autoHighlight() === 'always') {
      return 'always';
    }
    return autoHighlight() ? 'input-change' : false;
  });

  const [selectedValue, setSelectedValueUnwrapped] = useControlled<any>({
    controlled: selectedValueProp,
    default: () => (multiple() ? (defaultSelectedValue() ?? EMPTY_ARRAY) : defaultSelectedValue()),
    name: 'Combobox',
    state: 'selectedValue',
  });

  const filter = createMemo(() => {
    if (props.filter === null) {
      return () => true;
    }
    if (props.filter !== undefined) {
      return props.filter;
    }
    if (single() && !queryChangedAfterOpen()) {
      return createSingleSelectionCollatorFilter(
        collatorFilter,
        props.itemToStringLabel,
        selectedValue(),
      );
    }
    return createCollatorItemFilter(collatorFilter, props.itemToStringLabel);
  });

  // If neither inputValue nor defaultInputValue are provided, derive it from the
  // selected value for single mode so the input reflects the selection on mount.
  const initialDefaultInputValue = createMemo<ComponentProps<'input'>['value']>(() => {
    if (hasInputValue()) {
      return defaultInputValueProp() ?? '';
    }
    if (single()) {
      return stringifyAsLabel(selectedValue(), props.itemToStringLabel);
    }
    return '';
  });

  const [inputValue, setInputValueUnwrapped] = useControlled({
    controlled: inputValueProp,
    default: () => untrack(initialDefaultInputValue),
    name: 'Combobox',
    state: 'inputValue',
  });

  const [open, setOpenUnwrapped] = useControlled({
    controlled: () => props.open,
    default: () => props.defaultOpen,
    name: 'Combobox',
    state: 'open',
  });

  const isGrouped = createMemo(() => isGroupedItems(props.items));
  const query = createMemo(
    () => closeQuery() ?? (inputValue() === '' ? '' : String(inputValue()).trim()),
  );

  const selectedLabelString = createMemo(() =>
    single() ? stringifyAsLabel(selectedValue(), props.itemToStringLabel) : '',
  );

  const shouldBypassFiltering = createMemo(
    () =>
      single() &&
      !queryChangedAfterOpen() &&
      query() !== '' &&
      selectedLabelString() !== '' &&
      selectedLabelString().length === query().length &&
      collatorFilter.contains(selectedLabelString(), query()),
  );

  const filterQuery = createMemo(() => (shouldBypassFiltering() ? '' : query()));
  const shouldIgnoreExternalFiltering = createMemo(
    () => hasItems() && hasFilteredItemsProp() && shouldBypassFiltering(),
  );

  const flatItems = createMemo<readonly any[]>(() => {
    if (!props.items) {
      return EMPTY_ARRAY;
    }

    if (isGrouped()) {
      return props.items.flatMap((group) => group.items);
    }

    return props.items;
  });

  const filteredItems = createMemo<Value[] | Group<Value>[]>(() => {
    if (filteredItemsProp() && !shouldIgnoreExternalFiltering()) {
      return filteredItemsProp() as Value[] | Group<Value>[];
    }

    if (!props.items) {
      return EMPTY_ARRAY as Value[];
    }

    const filterQueryResolved = filterQuery();
    const filterFn = filter();
    const limitResolved = limit();
    if (isGrouped()) {
      const groupedItems = props.items as Group<Value>[];
      const resultingGroups: Group<Value>[] = [];
      let currentCount = 0;

      for (const group of groupedItems) {
        if (limitResolved > -1 && currentCount >= limitResolved) {
          break;
        }

        const candidateItems =
          filterQueryResolved === ''
            ? group.items
            : group.items.filter((item) =>
                filterFn(item, filterQueryResolved, props.itemToStringLabel),
              );

        if (candidateItems.length === 0) {
          continue;
        }

        const remainingLimit = limitResolved > -1 ? limitResolved - currentCount : Infinity;
        const itemsToTake = candidateItems.slice(0, remainingLimit);

        if (itemsToTake.length > 0) {
          const newGroup = { ...group, items: itemsToTake };
          resultingGroups.push(newGroup);
          currentCount += itemsToTake.length;
        }
      }

      return resultingGroups;
    }

    if (filterQueryResolved === '') {
      const flatItemsResolved = flatItems();
      return limitResolved > -1
        ? flatItemsResolved.slice(0, limitResolved)
        : // The cast here is done as `flatItems` is readonly.
          // valuesRef.current, a mutable ref, can be set to `flatFilteredItems`, which may
          // reference this exact readonly value, creating a mutation risk.
          // However, <Combobox.Item> can never mutate this value as the mutating effect
          // bails early when `items` is provided, and this is only ever returned
          // when `items` is provided due to the early return at the top of this hook.
          (flatItemsResolved as Value[]);
    }

    const limitedItems: Value[] = [];
    for (const item of flatItems()) {
      if (limitResolved > -1 && limitedItems.length >= limitResolved) {
        break;
      }
      if (filterFn(item, filterQueryResolved, props.itemToStringLabel)) {
        limitedItems.push(item);
      }
    }

    return limitedItems;
  });

  const flatFilteredItems = createMemo<Value[]>(() => {
    const filteredItemsResolved = filteredItems();
    if (isGrouped()) {
      const groups = filteredItemsResolved as Group<Value>[];
      return groups.flatMap((g) => g.items);
    }
    return filteredItemsResolved as Value[];
  });

  const store = createComboboxStore({
    initialState: {
      popupRef,
      emptyRef,
      inputRef,
      keyboardActiveRef,
      chipsContainerRef,
      clearRef,
      selectionEventRef,
      activeIndex: null,
      selectedIndex: null,
      positionerElement: null,
      listElement: null,
      listboxId: undefined,
      triggerElement: null,
      inputElement: null,
      popupSide: null,
      inputInsidePopup: true,
      forceMounted: false,
      transitionStatus: 'idle',
    },
    passThroughs: {
      id,
      selectedValue,
      open,
      query,
      mounted: () => mounted(),
      openMethod: () => openMethod(),
      items: () => props.items,
      selectionMode,
      name,
      disabled,
      readOnly,
      required,
      grid,
      isGrouped,
      virtualized,
      openOnInputClick,
      modal,
      autoHighlight: autoHighlightMode,
      submitOnItemClick,
      hasInputValue,
      inline: inlineProp,
      get popupProps() {
        return getFloatingProps();
      },
      get inputProps() {
        return getReferenceProps();
      },
      get triggerProps() {
        return triggerProps;
      },
    },
    context: {
      listRef,
      labelsRef,
      valuesRef,
      allValuesRef,
      get setOpen() {
        return setOpen;
      },
      get setInputValue() {
        return setInputValue;
      },
      get setSelectedValue() {
        return setSelectedValue;
      },
      get setIndices() {
        return setIndices;
      },
      get onItemHighlighted() {
        return props.onItemHighlighted || NOOP;
      },
      get handleSelection() {
        return handleSelection;
      },
      get getItemProps() {
        return getItemProps;
      },
      get requestSubmit() {
        return requestSubmit;
      },
      get onOpenChangeComplete() {
        return props.onOpenChangeComplete || NOOP;
      },
      get forceMount() {
        return forceMount;
      },
      isItemEqualToValue,
      get itemToStringLabel() {
        return props.itemToStringLabel;
      },
    },
  });

  const fieldRawValue = createMemo(() =>
    selectionMode() === 'none' ? inputValue() : selectedValue(),
  );
  const fieldStringValue = createMemo(() => {
    if (selectionMode() === 'none') {
      return fieldRawValue();
    }
    const selectedValueResolved = selectedValue();
    if (Array.isArray(selectedValueResolved)) {
      return selectedValueResolved.map((value) => stringifyAsValue(value, props.itemToStringValue));
    }
    return stringifyAsValue(selectedValueResolved, props.itemToStringValue);
  });

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const listboxId = store.useState('listboxId');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inline = store.useSelector('inline');
  const inputInsidePopup = store.useState('inputInsidePopup');

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open);
  const {
    openMethod,
    triggerProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  useField({
    id,
    name,
    commit: validation.commit,
    value: fieldRawValue,
    controlRef: () => (inputInsidePopup() ? triggerElement() : store.state.inputRef),
    getValue: () => fieldStringValue(),
  });

  const forceMount = () => {
    if (props.items) {
      // Ensure typeahead works on a closed list.
      labelsRef.splice(
        0,
        labelsRef.length,
        ...flatFilteredItems().map((item) => stringifyAsLabel(item, props.itemToStringLabel)),
      );
    } else {
      store.set('forceMounted', true);
    }
  };

  const initialSelectedValueRef = selectedValue();
  createEffect(() => {
    // Ensure the values and labels are registered for programmatic value changes.
    if (selectedValue() !== initialSelectedValueRef) {
      forceMount();
    }
  });

  const setIndices = (options: {
    activeIndex?: (number | null) | undefined;
    selectedIndex?: (number | null) | undefined;
    type?: ('none' | 'keyboard' | 'pointer') | undefined;
  }) => {
    store.set(options);
    const type: AriaCombobox.HighlightEventReason = options.type || 'none';

    if (options.activeIndex === undefined) {
      return;
    }

    if (options.activeIndex === null) {
      if (lastHighlightRef !== INITIAL_LAST_HIGHLIGHT) {
        lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
        props.onItemHighlighted?.(
          undefined,
          createGenericEventDetails(type, undefined, { index: -1 }),
        );
      }
    } else {
      const activeValue = valuesRef[options.activeIndex];
      lastHighlightRef = { value: activeValue, index: options.activeIndex };
      props.onItemHighlighted?.(
        activeValue,
        createGenericEventDetails(type, undefined, {
          index: options.activeIndex,
        }),
      );
    }
  };

  const setInputValue = (next: string, eventDetails: AriaCombobox.ChangeEventDetails) => {
    hadInputClearRef = eventDetails.reason === REASONS.inputClear;

    props.onInputValueChange?.(next, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    // If user is typing, ensure we don't auto-highlight on open due to a race
    // with the post-open effect that sets this flag.
    if (eventDetails.reason === REASONS.inputChange) {
      const event = eventDetails.event as Event;
      const inputType = (event as InputEvent).inputType;
      // Treat composition commits as typed input; autofill may omit `inputType` or
      // report `insertReplacementText`.
      const isTypedInput =
        event.type === 'compositionend' ||
        (inputType != null && inputType !== '' && inputType !== 'insertReplacementText');
      if (isTypedInput) {
        const hasQuery = next.trim() !== '';
        if (hasQuery) {
          setQueryChangedAfterOpen(true);
        }
        // Defer index updates until after the filtered items have been derived to ensure
        // `onItemHighlighted` receives the latest item.
        pendingQueryHighlightRef = { hasQuery };
        if (hasQuery && autoHighlightMode() && store.state.activeIndex == null) {
          store.set('activeIndex', 0);
        }
      }
    }

    setInputValueUnwrapped(next);
  };

  const setOpen = (nextOpen: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => {
    if (open() === nextOpen) {
      return;
    }

    // If the `Empty` component is not used, the positioner or popup should be hidden
    // with CSS. In this case, allow the Escape key to bubble to close a parent popup
    // if there are no items to show.
    if (
      eventDetails.reason === 'escape-key' &&
      hasItems() &&
      flatFilteredItems().length === 0 &&
      !store.state.emptyRef
    ) {
      eventDetails.allowPropagation();
    }

    props.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (!nextOpen && queryChangedAfterOpen()) {
      if (single()) {
        if (!inline()) {
          setCloseQuery(query());
        }
        // Avoid a flicker when closing the popup with an empty query.
        if (query() === '') {
          setQueryChangedAfterOpen(false);
        }
      } else if (multiple()) {
        if (inline() || inputInsidePopup()) {
          setIndices({ activeIndex: null });
        } else {
          // Freeze the current query so filtering remains stable while exiting.
          setCloseQuery(query());
        }
        // Clear the input immediately on close while retaining filtering via closeQuery for exit animations
        // if the input is outside the popup.
        setInputValue('', createChangeEventDetails(REASONS.inputClear, eventDetails.event));
      }
    }

    setOpenUnwrapped(nextOpen);

    if (
      !nextOpen &&
      inputInsidePopup() &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      setTouched(true);
      setFocused(false);

      if (validationMode() === 'onBlur') {
        const valueToValidate = selectionMode() === 'none' ? inputValue() : selectedValue();
        validation.commit(valueToValidate);
      }
    }
  };

  const setSelectedValue = (
    nextValue: Value | Value[] | null,
    eventDetails: AriaCombobox.ChangeEventDetails,
  ) => {
    // Cast to `any` due to conditional value type (single vs. multiple).
    // The runtime implementation already ensures the correct value shape.
    props.onSelectedValueChange?.(nextValue as any, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setSelectedValueUnwrapped(nextValue);

    const shouldFillInput =
      (selectionMode() === 'none' && store.state.popupRef && fillInputOnItemPress()) ||
      (single() && !store.state.inputInsidePopup);

    if (shouldFillInput) {
      setInputValue(
        stringifyAsLabel(nextValue, props.itemToStringLabel),
        createChangeEventDetails(eventDetails.reason, eventDetails.event),
      );
    }

    if (
      single() &&
      nextValue != null &&
      eventDetails.reason !== REASONS.inputChange &&
      queryChangedAfterOpen() &&
      !inline()
    ) {
      setCloseQuery(query());
    }
  };

  const handleSelection = (event: MouseEvent | PointerEvent | KeyboardEvent, passedValue?: any) => {
    let itemValue = passedValue;
    if (itemValue === undefined) {
      const idx = activeIndex();
      if (idx === null) {
        return;
      }
      itemValue = valuesRef[idx];
    }

    const targetEl = getTarget(event) as HTMLElement | null;
    const overrideEvent = store.state.selectionEventRef ?? selectionEventRef ?? event;
    store.set('selectionEventRef', null);
    selectionEventRef = null;
    const eventDetails = createChangeEventDetails(REASONS.itemPress, overrideEvent);

    // Let the link handle the click.
    const href = targetEl?.closest('a')?.getAttribute('href');
    if (href) {
      if (href.startsWith('#')) {
        setOpen(false, eventDetails);
      }
      return;
    }

    if (multiple()) {
      const currentSelectedValue = Array.isArray(selectedValue()) ? selectedValue() : [];
      const isCurrentlySelected = selectedValueIncludes(
        currentSelectedValue,
        itemValue,
        store.context.isItemEqualToValue,
      );
      const nextValue = isCurrentlySelected
        ? removeItem(currentSelectedValue, itemValue, store.context.isItemEqualToValue)
        : [...currentSelectedValue, itemValue];

      setSelectedValue(nextValue, eventDetails);

      const wasFiltering = store.state.inputRef ? store.state.inputRef.value.trim() !== '' : false;
      if (!wasFiltering) {
        return;
      }

      if (store.state.inputInsidePopup) {
        setInputValue('', createChangeEventDetails(REASONS.inputClear, eventDetails.event));
      } else {
        setOpen(false, eventDetails);
      }
    } else {
      setSelectedValue(itemValue, eventDetails);
      setOpen(false, eventDetails);
    }
  };

  const requestSubmit = () => {
    if (!store.selectors.submitOnItemClick()) {
      return;
    }

    const form = store.state.inputElement?.form;
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    }
  };

  const handleUnmount = () => {
    setMounted(false);
    props.onOpenChangeComplete?.(false);
    setQueryChangedAfterOpen(false);
    resetOpenInteractionType();
    setCloseQuery(null);

    if (selectionMode() === 'none') {
      setIndices({ activeIndex: null, selectedIndex: null });
    } else {
      setIndices({ activeIndex: null });
    }

    // Multiple selection mode:
    // If the user typed a filter and didn't select in multiple mode, clear the input
    // after close completes to avoid mid-exit flicker and start fresh on next open.
    if (
      multiple() &&
      store.state.inputRef &&
      store.state.inputRef.value !== '' &&
      !hadInputClearRef
    ) {
      setInputValue('', createChangeEventDetails(REASONS.inputClear));
    }

    // Single selection mode:
    // - If input is rendered inside the popup, clear it so the next open is blank
    // - If input is outside the popup, sync it to the selected value
    if (single()) {
      if (store.state.inputInsidePopup) {
        if (store.state.inputRef && store.state.inputRef.value !== '') {
          setInputValue('', createChangeEventDetails(REASONS.inputClear));
        }
      } else {
        const stringVal = stringifyAsLabel(selectedValue(), props.itemToStringLabel);
        if (store.state.inputRef && store.state.inputRef.value !== stringVal) {
          // If no selection was made, treat this as clearing the typed filter.
          const reason = stringVal === '' ? REASONS.inputClear : REASONS.none;
          setInputValue(stringVal, createChangeEventDetails(reason));
        }
      }
    }
  };

  // Support composing the Dialog component around an inline combobox.
  // `[role="dialog"]` is more interoperable than using a context, e.g. it can work
  // with third-party modal libraries, though the limitation is that the closest
  // `role=dialog` part must be the animated element.
  const resolvedPopupRef = createMemo<HTMLElement | null | undefined>(() => {
    const positionerEl = positionerElement();
    if (inline() && positionerEl) {
      return positionerEl.closest('[role="dialog"]') as HTMLElement | null;
    }
    return store.state.popupRef;
  });

  useOpenChangeComplete({
    enabled: () => !props.actionsRef,
    open,
    ref: resolvedPopupRef,
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

  createEffect(function syncSelectedIndex() {
    if (open() || selectionMode() === 'none') {
      return;
    }

    const registry = props.items ? flatItems() : allValuesRef;

    if (multiple()) {
      const currentValue = Array.isArray(selectedValue()) ? selectedValue() : [];
      const lastValue = currentValue[currentValue.length - 1];
      const lastIndex = findItemIndex(registry, lastValue, isItemEqualToValue);
      setIndices({ selectedIndex: lastIndex === -1 ? null : lastIndex });
    } else {
      const index = findItemIndex(registry, selectedValue(), isItemEqualToValue);
      setIndices({ selectedIndex: index === -1 ? null : index });
    }
  });

  createEffect(() => {
    if (props.items) {
      valuesRef.splice(0, valuesRef.length, ...flatFilteredItems());
      listRef.length = flatFilteredItems().length;
    }
  });

  createEffect(() => {
    const pendingHighlight = pendingQueryHighlightRef;
    if (pendingHighlight) {
      if (pendingHighlight.hasQuery) {
        if (autoHighlightMode()) {
          store.set('activeIndex', 0);
        }
      } else if (autoHighlightMode() === 'always') {
        store.set('activeIndex', 0);
      }
      pendingQueryHighlightRef = null;
    }

    if (!open() && !inline()) {
      return;
    }

    const shouldUseFlatFilteredItems = hasItems() || hasFilteredItemsProp();
    const candidateItems = shouldUseFlatFilteredItems ? flatFilteredItems() : valuesRef;
    const storeActiveIndex = store.state.activeIndex;

    if (storeActiveIndex == null) {
      if (autoHighlightMode() === 'always' && candidateItems.length > 0) {
        store.set('activeIndex', 0);
        return;
      }
      if (lastHighlightRef !== INITIAL_LAST_HIGHLIGHT) {
        lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
        store.context.onItemHighlighted(
          undefined,
          createGenericEventDetails(REASONS.none, undefined, { index: -1 }),
        );
      }
      return;
    }

    if (storeActiveIndex >= candidateItems.length) {
      if (lastHighlightRef !== INITIAL_LAST_HIGHLIGHT) {
        lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
        store.context.onItemHighlighted(
          undefined,
          createGenericEventDetails(REASONS.none, undefined, { index: -1 }),
        );
      }
      store.set('activeIndex', null);
      return;
    }

    const itemValue = candidateItems[storeActiveIndex];
    const previouslyHighlightedItemValue = lastHighlightRef.value;
    const isSameItem =
      previouslyHighlightedItemValue !== NO_ACTIVE_VALUE &&
      compareItemEquality(
        itemValue,
        previouslyHighlightedItemValue,
        store.context.isItemEqualToValue,
      );

    if (lastHighlightRef.index !== storeActiveIndex || !isSameItem) {
      lastHighlightRef = { value: itemValue, index: storeActiveIndex };
      store.context.onItemHighlighted(
        itemValue,
        createGenericEventDetails(REASONS.none, undefined, { index: storeActiveIndex }),
      );
    }
  });

  createEffect(() => {
    if (selectionMode() === 'none') {
      setFilled(String(inputValue()) !== '');
      return;
    }
    setFilled(
      multiple()
        ? Array.isArray(selectedValue()) && selectedValue().length > 0
        : selectedValue() != null,
    );
  });

  // Ensures that the active index is not set to 0 when the list is empty.
  // This avoids needing to press ArrowDown twice under certain conditions.
  createEffect(() => {
    if (hasItems() && autoHighlightMode() && flatFilteredItems().length === 0) {
      setIndices({ activeIndex: null });
    }
  });

  createEffect(
    on(
      query,
      () => {
        if (!open() || query() === '' || query() === String(initialDefaultInputValue())) {
          return;
        }
        setQueryChangedAfterOpen(true);
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      selectedValue,
      () => {
        if (selectionMode() === 'none') {
          return;
        }

        clearErrors(name());
        setDirty(selectedValue() !== validityData.initialValue);

        if (shouldValidateOnChange()) {
          validation.commit(selectedValue());
        } else {
          validation.commit(selectedValue(), true);
        }

        if (single() && !hasInputValue() && !inputInsidePopup()) {
          const nextInputValue = stringifyAsLabel(selectedValue(), props.itemToStringLabel);

          if (inputValue() !== nextInputValue) {
            setInputValue(nextInputValue, createChangeEventDetails(REASONS.none));
          }
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      inputValue,
      () => {
        if (selectionMode() !== 'none') {
          return;
        }

        clearErrors(name());
        setDirty(inputValue() !== validityData.initialValue);

        if (shouldValidateOnChange()) {
          validation.commit(inputValue());
        } else {
          validation.commit(inputValue(), true);
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.items,
      () => {
        if (!single() || hasInputValue() || inputInsidePopup() || queryChangedAfterOpen()) {
          return;
        }

        const nextInputValue = stringifyAsLabel(selectedValue(), props.itemToStringLabel);

        if (inputValue() !== nextInputValue) {
          setInputValue(nextInputValue, createChangeEventDetails(REASONS.none));
        }
      },
      { defer: true },
    ),
  );

  const floatingRootContext = useFloatingRootContext({
    get open() {
      return inline() ? true : open();
    },
    onOpenChange(nextOpen, eventDetails) {
      setOpen(nextOpen, eventDetails as AriaCombobox.ChangeEventDetails);
    },
    elements: {
      get reference() {
        return inputInsidePopup() ? triggerElement() : inputElement();
      },
      get floating() {
        return positionerElement();
      },
    },
  });
  const ariaHasPopup = createMemo<'grid' | 'listbox' | undefined>(() => {
    if (!inline()) {
      return grid() ? 'grid' : 'listbox';
    }
    return undefined;
  });

  const ariaExpanded = createMemo<'true' | 'false' | undefined>(() => {
    if (!inline()) {
      return open() ? 'true' : 'false';
    }
    return undefined;
  });

  const role: ElementProps = {
    get reference() {
      const isPlainInput = inputElement()?.tagName === 'INPUT';
      const shouldApplyAria = isPlainInput || open();

      const refData = isPlainInput
        ? ({
            autoComplete: 'off',
            spellCheck: 'false',
            autoCorrect: 'off',
            autoCapitalize: 'none',
          } as HTMLProps<HTMLInputElement>)
        : {};

      if (shouldApplyAria) {
        refData.role = 'combobox';
        refData['aria-expanded'] = ariaExpanded();
        refData['aria-haspopup'] = ariaHasPopup();
        // React re-renders after the listbox ref/id settle, so reading
        // `listElement?.id` is enough there. In Solid, the DOM node can exist
        // before its `id` attribute is assigned, and that DOM mutation is not a
        // reactive dependency. Keep the listbox id in reactive state instead.
        refData['aria-controls'] = open() ? listboxId() : undefined;
        refData['aria-autocomplete'] = autoComplete();
      }

      return refData as any;
    },
    floating: { role: 'presentation' },
  };

  const click = useClick({
    get context() {
      return floatingRootContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled() && openOnInputClick();
      },
      event: 'mousedown-only',
      toggle: false,
      // Apply a small delay for touch to let iOS viewport centering settle.
      // This avoids top-bottom flip flickers if the preferred position is "top" when first tapping.
      get touchOpenDelay() {
        return inputInsidePopup() ? 0 : 50;
      },
      reason: REASONS.inputPress,
    },
  });

  const dismiss = useDismiss({
    get context() {
      return floatingRootContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled() && !inline();
      },
      outsidePressEvent: {
        mouse: 'sloppy',
        // The visual viewport (affected by the mobile software keyboard) can be
        // somewhat small. The user may want to scroll the screen to see more of
        // the popup.
        touch: 'intentional',
      },
      // Without a popup, let the Escape key bubble the event up to other popups' handlers.
      get bubbles() {
        return inline() ? true : undefined;
      },
      outsidePress(event) {
        const target = getTarget(event) as Element | null;
        return (
          !contains(triggerElement(), target) &&
          !contains(store.state.inputRef, target) &&
          !contains(store.state.clearRef, target) &&
          !contains(store.state.chipsContainerRef, target)
        );
      },
    },
  });

  const listNavigation = useListNavigation({
    get context() {
      return floatingRootContext;
    },
    props: {
      get enabled() {
        return !readOnly() && !disabled();
      },
      get id() {
        return id();
      },
      get listRef() {
        return listRef;
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      virtual: true,
      get loopFocus() {
        return loopFocus();
      },
      get allowEscape() {
        return loopFocus() && !autoHighlightMode();
      },
      get focusItemOnOpen() {
        return queryChangedAfterOpen() || (selectionMode() === 'none' && !autoHighlightMode())
          ? false
          : 'auto';
      },
      get focusItemOnHover() {
        return highlightItemOnHover();
      },
      get resetOnPointerLeave() {
        return !keepHighlight();
      },
      // `cols` > 1 enables grid navigation.
      // Since <Combobox.Row> infers column sizes (and is required when building a grid),
      // it works correctly even with a value of `2`.
      // Floating UI tests don't require `role="row"` wrappers, so retains the number API.
      get cols() {
        return grid() ? 2 : 1;
      },
      get orientation() {
        return grid() ? 'horizontal' : undefined;
      },
      disabledIndices: EMPTY_ARRAY as number[],
      onNavigate(nextActiveIndex, event) {
        // Retain the highlight only while actually transitioning out or closed.
        if ((!event && !open()) || transitionStatus() === 'ending') {
          return;
        }

        if (!event) {
          setIndices({
            activeIndex: nextActiveIndex,
          });
        } else {
          setIndices({
            activeIndex: nextActiveIndex,
            type: keyboardActiveRef ? 'keyboard' : 'pointer',
          });
        }
      },
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    role,
    click,
    dismiss,
    listNavigation,
  ]);

  const itemsContextValue: ComboboxDerivedItemsContext = {
    query,
    hasItems,
    filteredItems,
    flatFilteredItems,
  };

  const serializedValue = createMemo(() => {
    if (Array.isArray(fieldRawValue())) {
      return '';
    }
    return stringifyAsValue(fieldRawValue(), props.itemToStringValue);
  });

  const hasMultipleSelection = () =>
    multiple() && Array.isArray(selectedValue()) && selectedValue().length > 0;
  const hiddenInputName = () => (multiple() || selectionMode() === 'none' ? undefined : name());

  const hiddenInputs = createMemo(() => {
    if (!multiple() || !Array.isArray(selectedValue()) || !name()) {
      return null;
    }

    return selectedValue().map((value: Value) => {
      const currentSerializedValue = () => stringifyAsValue(value, props.itemToStringValue);
      return <input type="hidden" name={name()} value={currentSerializedValue()} />;
    });
  });

  return (
    <ComboboxRootContext.Provider value={{ store }}>
      <ComboboxFloatingContext.Provider value={{ context: floatingRootContext }}>
        <ComboboxDerivedItemsContext.Provider value={itemsContextValue}>
          <ComboboxInputValueContext.Provider value={inputValue}>
            {props.children}
            <input
              {...(validation.getInputValidationProps({
                // Move focus when the hidden input is focused.
                onFocus() {
                  const triggerEl = triggerElement();
                  if (inputInsidePopup()) {
                    triggerEl?.focus();
                    return;
                  }

                  (store.state.inputRef || triggerEl)?.focus();
                },
                // Handle browser autofill.
                onInput(event: InputEvent) {
                  // Workaround for https://github.com/facebook/react/issues/9023
                  if (event.defaultPrevented) {
                    return;
                  }

                  const nextValue = (event.target as HTMLInputElement).value;
                  const details = createChangeEventDetails(REASONS.none, event);

                  function handleChange() {
                    // Browser autofill only writes a single scalar value.
                    if (multiple()) {
                      return;
                    }

                    if (selectionMode() === 'none') {
                      setDirty(nextValue !== validityData.initialValue);
                      setInputValue(nextValue, details);

                      if (shouldValidateOnChange()) {
                        validation.commit(nextValue);
                      }
                      return;
                    }

                    const matchingValue = valuesRef.find((v) => {
                      const candidate = stringifyAsValue(v, props.itemToStringValue);
                      if (candidate.toLowerCase() === nextValue.toLowerCase()) {
                        return true;
                      }
                      return false;
                    });

                    if (matchingValue != null) {
                      setDirty(matchingValue !== validityData.initialValue);
                      setSelectedValue?.(matchingValue, details);

                      if (shouldValidateOnChange()) {
                        validation.commit(matchingValue);
                      }
                    }
                  }

                  if (props.items) {
                    handleChange();
                  } else {
                    forceMount();
                    queueMicrotask(handleChange);
                  }
                },
              }) as any)}
              id={id() && hiddenInputName() == null ? `${id()}-hidden-input` : undefined}
              name={hiddenInputName()}
              autocomplete={props.formAutoComplete}
              disabled={disabled()}
              required={required() && !hasMultipleSelection()}
              readOnly={readOnly()}
              value={serializedValue()}
              ref={(el) => {
                if (props.inputRef) {
                  props.inputRef.current = el;
                }
                validation.inputRef.current = el;
              }}
              style={hiddenInputName() ? visuallyHiddenInput : visuallyHidden}
              tabIndex={-1}
              aria-hidden
            />
            {hiddenInputs()}
          </ComboboxInputValueContext.Provider>
        </ComboboxDerivedItemsContext.Provider>
      </ComboboxFloatingContext.Provider>
    </ComboboxRootContext.Provider>
  );
}

type SelectionMode = 'single' | 'multiple' | 'none';

type ComboboxItemValueType<ItemValue, Mode extends SelectionMode> = Mode extends 'multiple'
  ? ItemValue[]
  : ItemValue;

interface ComboboxRootProps<ItemValue> {
  children?: JSX.Element;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * The id of the component.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the popup is initially open.
   *
   * To render a controlled popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popup is currently open. Use when controlled.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popup is opened or closed.
   */
  onOpenChange?:
    | ((open: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called after any animations complete when the popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the popup opens when clicking the input.
   * @default true
   */
  openOnInputClick?: boolean | undefined;
  /**
   * Whether the first matching item is highlighted automatically.
   * - `false`: do not highlight automatically.
   * - `true`: highlight after the user types and keep the highlight while the query changes.
   * - `'always'`: highlight the first item as soon as the list opens.
   * @default false
   */
  autoHighlight?: (boolean | 'always') | undefined;
  /**
   * Whether the highlighted item should be preserved when the pointer leaves the list.
   * @default false
   */
  keepHighlight?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the input when the end of the list is reached while using the arrow keys. The first item can then be reached by pressing <kbd>ArrowDown</kbd> again from the input, or the last item can be reached by pressing <kbd>ArrowUp</kbd> from the input.
   * The input is always included in the focus loop per [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
   * When disabled, focus does not move when on the last element and the user presses <kbd>ArrowDown</kbd>, or when on the first element and the user presses <kbd>ArrowUp</kbd>.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * The input value of the combobox. Use when controlled.
   */
  inputValue?: ComponentProps<'input'>['value'] | undefined;
  /**
   * Callback fired when the input value of the combobox changes.
   */
  onInputValueChange?:
    | ((value: string, eventDetails: AriaCombobox.ChangeEventDetails) => void)
    | undefined;
  /**
   * The uncontrolled input value when initially rendered.
   *
   * To render a controlled input, use the `inputValue` prop instead.
   */
  defaultInputValue?: ComponentProps<'input'>['value'] | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the combobox will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the combobox manually.
   * Useful when the combobox's animation is controlled by an external library.
   */
  actionsRef?: ReactLikeRef<AriaCombobox.Actions | null> | undefined;
  /**
   * Callback fired when an item is highlighted or unhighlighted.
   * Receives the highlighted item value (or `undefined` if no item is highlighted) and event details with a `reason` property describing why the highlight changed.
   * The `reason` can be:
   * - `'keyboard'`: the highlight changed due to keyboard navigation.
   * - `'pointer'`: the highlight changed due to pointer hovering.
   * - `'none'`: the highlight changed programmatically.
   */
  onItemHighlighted?:
    | ((itemValue: ItemValue | undefined, eventDetails: AriaCombobox.HighlightEventDetails) => void)
    | undefined;
  /**
   * A ref to the hidden input element.
   */
  inputRef?: ReactLikeRef<HTMLInputElement | null> | undefined;
  /**
   * Whether list items are presented in a grid layout.
   * When enabled, arrow keys navigate across rows and columns inferred from DOM rows.
   * @default false
   */
  grid?: boolean | undefined;
  /**
   * The items to be displayed in the list.
   * Can be either a flat array of items or an array of groups with items.
   */
  items?: (readonly any[] | readonly Group<any>[]) | undefined;
  /**
   * Filtered items to display in the list.
   * When provided, the list will use these items instead of filtering the `items` prop internally.
   * Use when you want to control filtering logic externally with the `useFilter()` hook.
   */
  filteredItems?: (readonly any[] | readonly Group<any>[]) | undefined;
  /**
   * Filter function used to match items vs input query.
   */
  filter?:
    | (
        | null
        | ((
            itemValue: ItemValue,
            query: string,
            itemToString?: (itemValue: ItemValue) => string,
          ) => boolean)
      )
    | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for display in the input.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   */
  itemToStringLabel?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   */
  itemToStringValue?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a combobox item value matches the current selected value. Useful when item values are objects without matching referentially.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: ItemValue, value: ItemValue) => boolean) | undefined;
  /**
   * Whether the items are being externally virtualized.
   * @default false
   */
  virtualized?: boolean | undefined;
  /**
   * Whether the list is rendered inline without using the popup.
   * @default false
   */
  inline?: boolean | undefined;
  /**
   * Determines if the popup enters a modal state when open.
   * - `true`: user interaction is limited to the popup: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   * @default false
   */
  modal?: boolean | undefined;
  /**
   * The maximum number of items to display in the list.
   * @default -1
   */
  limit?: number | undefined;
  /**
   * Controls how the component behaves with respect to list filtering and inline autocompletion.
   * - `list` (default): items are dynamically filtered based on the input value. The input value does not change based on the active item.
   * - `both`: items are dynamically filtered based on the input value, which will temporarily change based on the active item (inline autocompletion).
   * - `inline`: items are static (not filtered), and the input value will temporarily change based on the active item (inline autocompletion).
   * - `none`: items are static (not filtered), and the input value will not change based on the active item.
   * @default 'list'
   */
  autoComplete?: ('list' | 'both' | 'inline' | 'none') | undefined;
  /**
   * Provides a hint to the browser for autofill on the hidden input element.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  formAutoComplete?: string | undefined;
  /**
   * The locale to use for string comparison.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * Whether clicking an item should submit the owning form.
   * @default false
   */
  submitOnItemClick?: boolean | undefined;
  /**
   * INTERNAL: When `selectionMode` is `none`, controls whether selecting an item fills the input.
   */
  fillInputOnItemPress?: boolean | undefined;
}

export type AriaComboboxProps<
  Value,
  Mode extends SelectionMode = 'none',
> = ComboboxRootProps<Value> & {
  /**
   * How the combobox should remember the selected value.
   * - `single`: Remembers the last selected value.
   * - `multiple`: Remember all selected values.
   * - `none`: Do not remember the selected value.
   * @default 'none'
   */
  selectionMode?: Mode | undefined;
  /**
   * The selected value of the combobox. Use when controlled.
   */
  selectedValue?: ComboboxItemValueType<Value, Mode> | undefined;
  /**
   * The uncontrolled selected value of the combobox when it's initially rendered.
   *
   * To render a controlled combobox, use the `selectedValue` prop instead.
   */
  defaultSelectedValue?: (ComboboxItemValueType<Value, Mode> | null) | undefined;
  /**
   * Callback fired when the selected value of the combobox changes.
   */
  onSelectedValueChange?:
    | ((
        value: ComboboxItemValueType<Value, Mode>,
        eventDetails: AriaCombobox.ChangeEventDetails,
      ) => void)
    | undefined;
};

export namespace AriaCombobox {
  export type Props<Value, Mode extends SelectionMode = 'none'> = AriaComboboxProps<Value, Mode>;

  export interface State {}

  export interface Actions {
    unmount: () => void;
  }

  export type HighlightEventReason = 'keyboard' | 'pointer' | 'none';
  export type HighlightEventDetails = BaseUIGenericEventDetails<
    HighlightEventReason,
    { index: number }
  >;

  export type ChangeEventReason =
    | typeof REASONS.triggerPress
    | typeof REASONS.outsidePress
    | typeof REASONS.itemPress
    | typeof REASONS.escapeKey
    | typeof REASONS.listNavigation
    | typeof REASONS.focusOut
    | typeof REASONS.inputChange
    | typeof REASONS.inputClear
    | typeof REASONS.clearPress
    | typeof REASONS.chipRemovePress
    | typeof REASONS.none;
  export type ChangeEventDetails = BaseUIChangeEventDetails<ChangeEventReason>;
}
