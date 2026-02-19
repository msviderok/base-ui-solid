import { ownerDocument } from '@base-ui/utils/owner';
import { createEffect, mergeProps as solidMergeProps } from 'solid-js';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useClick, useTypeahead } from '../../floating-ui-solid';
import { contains, getTarget, stopEvent } from '../../floating-ui-solid/utils';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { getPseudoElementBounds } from '../../utils/getPseudoElementBounds';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import type { Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxInputValueContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '../utils/stateAttributesMapping';

const BOUNDARY_OFFSET = 2;

/**
 * A button that opens the popup.
 * Renders a `<button>` element.
 */
export function ComboboxTrigger(componentProps: ComboboxTrigger.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'nativeButton',
    'disabled',
    'id',
  ]);
  const nativeButton = () => local.nativeButton ?? true;
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
  const store = useComboboxRootContext();
  const { filteredItems } = useComboboxDerivedItemsContext();

  const selectionMode = store.useState('selectionMode');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const required = store.useState('required');
  const mounted = store.useState('mounted');
  const popupSideValue = store.useState('popupSide');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const triggerProps = store.useState('triggerProps');
  const triggerElement = store.useState('triggerElement');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const rootId = store.useState('id');
  const open = store.useState('open');
  const selectedValue = store.useState('selectedValue');
  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const hasSelectedValue = store.useState('hasSelectedValue');

  const floatingRootContext = useComboboxFloatingContext();
  const inputValue = useComboboxInputValueContext();

  const focusTimeout = useTimeout();

  const disabled = () => fieldDisabled() || comboboxDisabled() || disabledProp();
  const listEmpty = () => filteredItems().length === 0;
  const popupSide = () => (mounted() && positionerElement() ? popupSideValue() : null);

  useLabelableId({ id: () => (inputInsidePopup() ? idProp() : undefined) });
  const id = () => (inputInsidePopup() ? (idProp() ?? rootId()) : idProp());

  let currentPointerTypeRef = '';

  function trackPointerType(event: PointerEvent) {
    currentPointerTypeRef = event.pointerType;
  }

  const domReference = floatingRootContext.useState('domReferenceElement');

  // Update the floating root context to use the trigger element when it differs from the current reference.
  // This ensures useClick and useTypeahead attach handlers to the correct element.
  createEffect(() => {
    if (!inputInsidePopup()) {
      return;
    }
    if (triggerElement() && triggerElement() !== domReference()) {
      floatingRootContext.set('domReferenceElement', triggerElement());
    }
  });

  const triggerTypeahead = useTypeahead(floatingRootContext, {
    enabled: () => !open() && !readOnly() && !comboboxDisabled() && selectionMode() === 'single',
    listRef: store.state.labelsRef,
    activeIndex,
    selectedIndex,
    onMatch(index) {
      const nextSelectedValue = store.state.valuesRef[index];
      if (nextSelectedValue !== undefined) {
        store.state.setSelectedValue(nextSelectedValue, createChangeEventDetails('none'));
      }
    },
  });

  const triggerClick = useClick(floatingRootContext, {
    enabled: () => !readOnly() && !comboboxDisabled(),
    event: 'mousedown',
  });

  const { buttonRef, getButtonProps } = useButton({
    native: nativeButton,
    disabled,
  });

  const state: ComboboxTrigger.State = solidMergeProps(fieldState, {
    get open() {
      return open();
    },
    get disabled() {
      return disabled();
    },
    get popupSide() {
      return popupSide();
    },
    get listEmpty() {
      return listEmpty();
    },
    get placeholder() {
      return !hasSelectedValue();
    },
  });

  const setTriggerElement = (element: HTMLElement | null | undefined) => {
    store.set('triggerElement', element);
  };

  const element = useRenderElement('button', componentProps, {
    ref: (el) => {
      buttonRef(el);
      setTriggerElement(el);
    },
    state,
    get props() {
      return [
        triggerProps(),
        triggerClick().reference,
        triggerTypeahead().reference,
        {
          get id() {
            return id();
          },
          get tabIndex() {
            return inputInsidePopup() ? 0 : -1;
          },
          get role() {
            return inputInsidePopup() ? 'combobox' : undefined;
          },
          get 'aria-expanded'() {
            return open() ? 'true' : 'false';
          },
          get 'aria-haspopup'() {
            return inputInsidePopup() ? 'dialog' : 'listbox';
          },
          get 'aria-controls'() {
            return open() ? listElement()?.id : undefined;
          },
          get 'aria-required'() {
            return inputInsidePopup() ? required() || undefined : undefined;
          },
          get 'aria-labelledby'() {
            return labelId();
          },
          onPointerDown: trackPointerType,
          onPointerEnter: trackPointerType,
          onFocus() {
            setFocused(true);
            if (disabled() || readOnly()) {
              return;
            }

            focusTimeout.start(0, store.state.forceMount);
          },
          onBlur(event: FocusEvent) {
            // If focus is moving into the popup, don't count it as a blur.
            if (contains(positionerElement(), event.relatedTarget as Element | null)) {
              return;
            }

            setTouched(true);
            setFocused(false);

            if (validationMode() === 'onBlur') {
              const valueToValidate = selectionMode() === 'none' ? inputValue() : selectedValue();
              validation.commit(valueToValidate);
            }
          },
          onMouseDown(event: MouseEvent) {
            if (disabled() || readOnly()) {
              return;
            }

            if (!inputInsidePopup()) {
              floatingRootContext.set('domReferenceElement', event.currentTarget);
            }

            // Ensure items are registered for initial selection highlight.
            store.state.forceMount();

            if (currentPointerTypeRef !== 'touch') {
              store.state.inputRef?.focus();

              if (!inputInsidePopup()) {
                event.preventDefault();
              }
            }

            if (open()) {
              return;
            }

            const doc = ownerDocument(event.currentTarget as Element | null);

            function handleMouseUp(mouseEvent: MouseEvent) {
              const triggerEl = triggerElement();
              if (!triggerEl) {
                return;
              }

              const mouseUpTarget = getTarget(mouseEvent) as Element | null;
              const positioner = store.state.positionerElement;
              const list = store.state.listElement;

              if (
                contains(triggerEl, mouseUpTarget) ||
                contains(positioner, mouseUpTarget) ||
                contains(list, mouseUpTarget) ||
                mouseUpTarget === triggerEl
              ) {
                return;
              }

              const bounds = getPseudoElementBounds(triggerEl);

              const withinHorizontal =
                mouseEvent.clientX >= bounds.left - BOUNDARY_OFFSET &&
                mouseEvent.clientX <= bounds.right + BOUNDARY_OFFSET;
              const withinVertical =
                mouseEvent.clientY >= bounds.top - BOUNDARY_OFFSET &&
                mouseEvent.clientY <= bounds.bottom + BOUNDARY_OFFSET;

              if (withinHorizontal && withinVertical) {
                return;
              }

              store.state.setOpen(false, createChangeEventDetails('cancel-open', mouseEvent));
            }

            if (inputInsidePopup()) {
              doc.addEventListener('mouseup', handleMouseUp, { once: true });
            }
          },
          onKeyDown(event: KeyboardEvent) {
            if (disabled() || readOnly()) {
              return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              stopEvent(event);
              store.state.setOpen(true, createChangeEventDetails(REASONS.listNavigation, event));
              store.state.inputRef?.focus();
            }
          },
        },
        validation ? validation.getValidationProps(elementProps) : elementProps,
        getButtonProps,
      ];
    },
    stateAttributesMapping: triggerStateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface ComboboxTriggerState extends FieldRoot.State {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the combobox doesn't have a value.
   */
  placeholder: boolean;
}

export interface ComboboxTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxTrigger.State> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxTrigger {
  export type State = ComboboxTriggerState;
  export type Props = ComboboxTriggerProps;
}
