import { createRenderEffect, createSignal, mergeProps as solidMergeProps } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { contains, stopEvent } from '../../floating-ui-solid/utils';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { isAndroid, isFirefox } from '../../utils/detectBrowser';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps } from '../../utils/types';
import type { Side } from '../../utils/useAnchorPositioning';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useComboboxChipsContext } from '../chips/ComboboxChipsContext';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import {
  useComboboxDerivedItemsContext,
  useComboboxInputValueContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A text input to search for items in the list.
 * Renders an `<input>` element.
 */
export function ComboboxInput(componentProps: ComboboxInput.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'id']);
  const disabledProp = () => local.disabled ?? false;
  const idProp = () => local.id;

  const {
    state: fieldState,
    disabled: fieldDisabled,
    setTouched,
    setFocused,
    validationMode,
    validation,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();
  const comboboxChipsContext = useComboboxChipsContext();
  const positioning = useComboboxPositionerContext(true);
  const hasPositionerParent = () => Boolean(positioning);
  const { store } = useComboboxRootContext();
  const { filteredItems } = useComboboxDerivedItemsContext();
  // `inputValue` can't be placed in the store.
  // https://github.com/mui/base-ui/issues/2703
  const inputValue = useComboboxInputValueContext();
  const direction = useDirection();

  const required = store.useSelector('required');
  const comboboxDisabled = store.useSelector('disabled');
  const readOnly = store.useSelector('readOnly');
  const name = store.useSelector('name');
  const selectionMode = store.useSelector('selectionMode');
  const autoHighlightMode = store.useSelector('autoHighlight');
  const open = store.useSelector('open');
  const mounted = store.useSelector('mounted');
  const selectedValue = store.useSelector('selectedValue');
  const popupSideValue = store.useState('popupSide');
  const positionerElement = store.useState('positionerElement');
  const rootId = store.useSelector('id');
  const inline = store.useSelector('inline');

  const autoHighlightEnabled = () => Boolean(autoHighlightMode());
  const popupSide = () => (mounted() && positionerElement() ? popupSideValue() : null);
  const disabled = () => fieldDisabled() || comboboxDisabled() || disabledProp();
  const listEmpty = () => filteredItems().length === 0;

  const isInsidePopup = () => hasPositionerParent() || inline();
  const id = useBaseUiId(() => idProp() ?? (!isInsidePopup() ? rootId() : undefined));

  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  let isComposingRef = false;
  let lastActiveIndexRef = null as number | null;
  let shouldRestoreActiveIndexRef = false;
  const renderedValue = () =>
    String(componentProps.value ?? composingValue() ?? inputValue() ?? '');

  const setInputElement = (element: HTMLInputElement | null | undefined) => {
    const nextIsInsidePopup = hasPositionerParent() || inline();
    const inputElementChanged = store.state.inputElement !== element;

    if (inputElementChanged && nextIsInsidePopup && !store.selectors.hasInputValue()) {
      store.context.setInputValue('', createChangeEventDetails(REASONS.none));
    }

    store.set({
      inputElement: element,
      inputInsidePopup: nextIsInsidePopup,
    });
  };

  const state: ComboboxInput.State = solidMergeProps(fieldState, {
    get open() {
      return open();
    },
    get disabled() {
      return disabled();
    },
    get readOnly() {
      return readOnly();
    },
    get popupSide() {
      return popupSide();
    },
    get listEmpty() {
      return listEmpty();
    },
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (!comboboxChipsContext) {
      return undefined;
    }

    let nextIndex: number | undefined;

    const { highlightedChipIndex } = comboboxChipsContext;

    const chipIndex = highlightedChipIndex();
    const val = selectedValue();
    if (chipIndex !== undefined) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (chipIndex > 0) {
          nextIndex = chipIndex - 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (chipIndex < val.length - 1) {
          nextIndex = chipIndex + 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        // Move highlight appropriately after removal.
        const computedNextIndex = chipIndex >= val.length - 1 ? val.length - 2 : chipIndex;
        // If the computed index is negative, treat it as no highlight.
        nextIndex = computedNextIndex >= 0 ? computedNextIndex : undefined;
        store.context.setIndices({ activeIndex: null, selectedIndex: null, type: 'keyboard' });
      }
      return nextIndex;
    }

    // Handle navigation when no chip is highlighted
    if (
      event.key === 'ArrowLeft' &&
      ((event.currentTarget as HTMLInputElement).selectionStart ?? 0) === 0 &&
      val.length > 0
    ) {
      event.preventDefault();
      const lastChipIndex = Math.max(val.length - 1, 0);
      nextIndex = lastChipIndex;
    } else if (
      event.key === 'Backspace' &&
      (event.currentTarget as HTMLInputElement).value === '' &&
      val.length > 0
    ) {
      store.context.setIndices({ activeIndex: null, selectedIndex: null, type: 'keyboard' });
      event.preventDefault();
    }

    return nextIndex;
  }

  const element = useRenderElement('input', componentProps, {
    state,
    ref: (el) => {
      store.set('inputRef', el);
      setInputElement(el);
    },
    get props() {
      return [
        store.selectors.inputProps,
        store.selectors.triggerProps,
        {
          type: 'text',
          'aria-readonly': readOnly() || undefined,
          'aria-required': required() || undefined,
          'aria-labelledby': labelId(),
          disabled: disabled(),
          readOnly: readOnly(),
          required: selectionMode() === 'none' ? required() : undefined,
          ...(selectionMode() === 'none' && name() && { name: name() }),
          id: id(),
          onFocus() {
            setFocused(true);

            if (!inline || !shouldRestoreActiveIndexRef) {
              return;
            }

            shouldRestoreActiveIndexRef = false;
            const nextActiveIndex = lastActiveIndexRef;

            if (
              nextActiveIndex == null ||
              // `valuesRef` can be sparse, so guard against restoring a removed slot.
              !Object.hasOwn(store.context.valuesRef, nextActiveIndex)
            ) {
              return;
            }

            store.context.setIndices({ activeIndex: nextActiveIndex });
          },
          onBlur(event: FocusEvent) {
            setTouched(true);
            setFocused(false);

            const activeIndex = store.state.activeIndex;
            if (inline() && activeIndex !== null && autoHighlightMode() !== 'always') {
              lastActiveIndexRef = activeIndex;
              shouldRestoreActiveIndexRef = true;
              store.context.setIndices({ activeIndex: null });
            }

            if (
              open() &&
              !inline() &&
              !store.state.inputInsidePopup &&
              !contains(positionerElement(), event.relatedTarget as Element | null)
            ) {
              store.context.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
            }

            if (validationMode() === 'onBlur') {
              const valueToValidate = selectionMode() === 'none' ? inputValue() : selectedValue();
              validation.commit(valueToValidate);
            }
          },
          onCompositionStart(event: CompositionEvent) {
            if (isAndroid) {
              return;
            }
            isComposingRef = true;
            setComposingValue((event.currentTarget as HTMLInputElement).value);
          },
          onCompositionEnd(event: CompositionEvent) {
            isComposingRef = false;
            const next = (event.currentTarget as HTMLInputElement).value;
            setComposingValue(null);
            store.context.setInputValue(next, createChangeEventDetails(REASONS.inputChange, event));
          },
          onInput(event: InputEvent) {
            // Autofill may not provide `inputType` (Chrome) or may report
            // `insertReplacementText` (Firefox).
            const inputType = (event as InputEvent).inputType;
            const autofillLikeInput = !inputType || inputType === 'insertReplacementText';
            const shouldOpenOnInput = isComposingRef || !autofillLikeInput;
            const input = event.currentTarget as HTMLInputElement;

            // During IME composition, avoid propagating controlled updates to prevent
            // filtering the options prematurely so `Empty` won't show incorrectly.
            // We can't rely on this check for Android due to how it handles composition
            // events with some keyboards (e.g. Samsung keyboard with predictive text on
            // treats all text as always-composing).
            // https://github.com/mui/base-ui/issues/2942
            if (isComposingRef) {
              const nextVal = (event.currentTarget as HTMLInputElement).value;
              setComposingValue(nextVal);

              if (
                nextVal === '' &&
                !store.selectors.openOnInputClick() &&
                !store.state.inputInsidePopup
              ) {
                store.context.setOpen(false, createChangeEventDetails(REASONS.inputClear, event));
              }

              const trimmed = nextVal.trim();
              const shouldMaintainHighlight = autoHighlightEnabled() && trimmed !== '';

              if (!readOnly() && !disabled() && trimmed) {
                if (shouldOpenOnInput) {
                  store.context.setOpen(true, createChangeEventDetails(REASONS.inputChange, event));
                  if (!autoHighlightEnabled()) {
                    store.context.setIndices({
                      activeIndex: null,
                      selectedIndex: null,
                      type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
                    });
                  }
                }
              }

              if (open() && store.state.activeIndex !== null && !shouldMaintainHighlight) {
                store.context.setIndices({
                  activeIndex: null,
                  selectedIndex: null,
                  type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
                });
              }

              return;
            }

            store.context.setInputValue(
              input.value,
              createChangeEventDetails(REASONS.inputChange, event),
            );

            const empty = input.value === '';
            const clearDetails = createChangeEventDetails(REASONS.inputClear, event);

            if (empty && !store.state.inputInsidePopup) {
              if (selectionMode() === 'single') {
                store.context.setSelectedValue(null, clearDetails);
              }

              if (!store.selectors.openOnInputClick()) {
                store.context.setOpen(false, clearDetails);
              }
            }

            const trimmed = input.value.trim();
            if (!readOnly() && !disabled() && trimmed) {
              if (shouldOpenOnInput) {
                store.context.setOpen(true, createChangeEventDetails(REASONS.inputChange, event));
                // When autoHighlight is enabled, keep the highlight (will be set to 0 in root).
                if (!autoHighlightEnabled()) {
                  store.context.setIndices({
                    activeIndex: null,
                    selectedIndex: null,
                    type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
                  });
                }
              }
            }

            // When the user types, ensure the list resets its highlight so that
            // virtual focus returns to the input (aria-activedescendant is
            // cleared).
            if (open() && store.state.activeIndex !== null && !autoHighlightEnabled()) {
              store.context.setIndices({
                activeIndex: null,
                selectedIndex: null,
                type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
              });
            }
          },
          onKeyDown(event: KeyboardEvent) {
            if (disabled() || readOnly()) {
              return;
            }

            if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
              return;
            }

            store.set('keyboardActiveRef', true);
            const input = event.currentTarget as HTMLInputElement;
            const scrollAmount = input.scrollWidth - input.clientWidth;
            const isRTL = direction() === 'rtl';

            if (event.key === 'Home') {
              stopEvent(event);
              const cursor = isFirefox && isRTL ? input.value.length : 0;
              input.setSelectionRange(cursor, cursor);
              input.scrollLeft = 0;
              return;
            }

            if (event.key === 'End') {
              stopEvent(event);
              const cursor = isFirefox && isRTL ? 0 : input.value.length;
              input.setSelectionRange(cursor, cursor);
              input.scrollLeft = isRTL ? -scrollAmount : scrollAmount;
              return;
            }

            if (!mounted() && event.key === 'Escape') {
              const isClear =
                selectionMode() === 'multiple' && Array.isArray(selectedValue())
                  ? selectedValue().length === 0
                  : selectedValue() === null;

              const details = createChangeEventDetails(REASONS.escapeKey, event);
              const value = selectionMode() === 'multiple' ? [] : null;
              store.context.setInputValue('', details);
              store.context.setSelectedValue(value, details);

              if (!isClear && !inline() && !details.isPropagationAllowed) {
                event.stopPropagation();
              }

              return;
            }

            // Handle deletion when no chip is highlighted and the input is empty.
            if (
              comboboxChipsContext &&
              event.key === 'Backspace' &&
              input.value === '' &&
              comboboxChipsContext.highlightedChipIndex() === undefined &&
              Array.isArray(selectedValue()) &&
              selectedValue().length > 0
            ) {
              const newValue = selectedValue().slice(0, -1);
              // If the removed item was also the active (highlighted) item, clear highlight
              store.context.setIndices({
                activeIndex: null,
                selectedIndex: null,
                type: store.state.keyboardActiveRef ? 'keyboard' : 'pointer',
              });
              store.context.setSelectedValue(
                newValue,
                createChangeEventDetails(REASONS.none, event),
              );
              return;
            }

            const hadHighlightedChip = comboboxChipsContext?.highlightedChipIndex !== undefined;
            const nextIndex = handleKeyDown(event);

            comboboxChipsContext?.setHighlightedChipIndex(nextIndex);

            if (nextIndex !== undefined) {
              comboboxChipsContext?.chipsRef.current[nextIndex]?.focus();
            } else if (hadHighlightedChip) {
              store.state.inputRef?.focus();
            }

            // event.isComposing
            if (event.which === 229) {
              return;
            }

            if (event.key === 'Enter' && open()) {
              const activeIndex = store.state.activeIndex;
              const nativeEvent = event;

              if (activeIndex === null) {
                // Allow form submission when no item is highlighted.
                store.context.setOpen(false, createChangeEventDetails(REASONS.none, nativeEvent));
                return;
              }

              stopEvent(event);

              const listItem = store.context.listRef[activeIndex];

              if (listItem) {
                store.set('selectionEventRef', nativeEvent);
                listItem.click();
                store.set('selectionEventRef', null);
              }
            }
          },
          onPointerMove() {
            store.set('keyboardActiveRef', false);
          },
          onPointerDown() {
            store.set('keyboardActiveRef', false);
          },
        },
        validation ? validation.getValidationProps(elementProps) : elementProps,
      ];
    },
    stateAttributesMapping: triggerStateAttributesMapping,
  });

  // Avoid redundant DOM value writes so the browser can preserve the current
  // selection while a controlled input is being edited in the middle.
  createRenderEffect(() => {
    const input = store.state.inputRef;
    const nextValue = renderedValue();

    if (input && input.value !== nextValue) {
      input.value = nextValue;
    }
  });

  return <>{element()}</>;
}

export interface ComboboxInputState extends FieldRoot.State {
  /**
   * Whether the corresponding popup is open.
   */
  open: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the component should ignore user edits.
   */
  readOnly: boolean;
}

export interface ComboboxInputProps extends BaseUIComponentProps<'input', ComboboxInput.State> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxInput {
  export type State = ComboboxInputState;
  export type Props = ComboboxInputProps;
}
