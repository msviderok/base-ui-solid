import { ownerDocument } from '@base-ui/utils/owner';
import {
  createEffect,
  createMemo,
  onCleanup,
  mergeProps as solidMergeProps,
  type JSX,
} from 'solid-js';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { fieldValidityMapping } from '../../field/utils/constants';
import { contains, getFloatingFocusElement } from '../../floating-ui-solid/utils';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { useLabelableId } from '../../labelable-provider/useLabelableId';
import { mergeProps } from '../../merge-props';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { getPseudoElementBounds } from '../../utils/getPseudoElementBounds';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, NativeButtonProps, type HTMLProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { useSelectRootContext } from '../root/SelectRootContext';

const BOUNDARY_OFFSET = 2;
const SELECTED_DELAY = 400;
const UNSELECTED_DELAY = 200;

const stateAttributesMapping: StateAttributesMapping<SelectTrigger.State> = {
  ...pressableTriggerOpenStateMapping,
  ...fieldValidityMapping,
  value: () => null,
};

/**
 * A button that opens the select popup.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectTrigger(componentProps: SelectTrigger.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'id',
    'disabled',
    'nativeButton',
  ]);
  const idProp = () => local.id;
  const disabledProp = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;

  const {
    setTouched,
    setFocused,
    validationMode,
    state: fieldState,
    disabled: fieldDisabled,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();
  const {
    store,
    setOpen,
    selectionRef,
    validation,
    readOnly,
    required,
    alignItemWithTriggerActiveRef,
    disabled: selectDisabled,
    keyboardActiveRef,
  } = useSelectRootContext();

  const disabled = () => fieldDisabled() || selectDisabled() || disabledProp();

  const open = store.useState('open');
  const value = store.useState('value');
  const triggerProps = store.useState('triggerProps');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const rootId = store.useState('id');
  const hasSelectedValue = store.useState('hasSelectedValue');
  const shouldCheckNullItemLabel = () => !hasSelectedValue() && open();
  const hasNullItemLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  const id = () => idProp() ?? rootId();
  useLabelableId({ id });

  const positionerRef = positionerElement();

  let triggerRef = null as HTMLElement | null | undefined;

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const setTriggerElement = (element: HTMLElement | null | undefined) => {
    store.set('triggerElement', element);
  };

  const timeoutFocus = useTimeout();
  const timeoutMouseDown = useTimeout();
  const selectedDelayTimeout = useTimeout();
  const unselectedDelayTimeout = useTimeout();

  createEffect(() => {
    if (open()) {
      const hasSelectedItemInList = hasSelectedValue() || hasNullItemLabel();
      const shouldDelayUnselectedMouseUpLonger = !hasSelectedItemInList;

      // When there is no selected item in the list (placeholder-only selects), a mousedown
      // on the trigger followed by a quick mouseup over the first option can accidentally select
      // within 200ms. Delay unselected mouseup to match the safer 400ms window.
      if (shouldDelayUnselectedMouseUpLonger) {
        selectedDelayTimeout.start(SELECTED_DELAY, () => {
          selectionRef.current.allowUnselectedMouseUp = true;
          selectionRef.current.allowSelectedMouseUp = true;
        });
      } else {
        // mousedown -> move to unselected item -> mouseup should not select within 200ms.
        unselectedDelayTimeout.start(UNSELECTED_DELAY, () => {
          selectionRef.current.allowUnselectedMouseUp = true;

          // mousedown -> mouseup on selected item should not select within 400ms.
          selectedDelayTimeout.start(UNSELECTED_DELAY, () => {
            selectionRef.current.allowSelectedMouseUp = true;
          });
        });
      }

      onCleanup(() => {
        selectedDelayTimeout.clear();
        unselectedDelayTimeout.clear();
      });
    }

    selectionRef.current = {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
    };

    timeoutMouseDown.clear();
  });

  const ariaControlsId = createMemo(() => {
    return listElement()?.id ?? getFloatingFocusElement(positionerElement())?.id;
  });

  const props = createMemo<any>(() =>
    mergeProps<'button'>(
      triggerProps(),
      {
        id: id(),
        role: 'combobox',
        'aria-expanded': open() ? 'true' : 'false',
        'aria-haspopup': 'listbox',
        'aria-controls': open() ? ariaControlsId() : undefined,
        'aria-labelledby': labelId(),
        'aria-readonly': readOnly() || undefined,
        'aria-required': required() || undefined,
        tabIndex: disabled() ? -1 : 0,
        ref(el) {
          if (typeof componentProps.ref === 'function') {
            componentProps.ref(el);
          } else {
            componentProps.ref = el;
          }
          triggerRef = el;
          buttonRef(el);
          setTriggerElement(el);
        },
        onFocus(event: FocusEvent) {
          setFocused(true);

          // The popup element shouldn't obscure the focused trigger.
          if (open() && alignItemWithTriggerActiveRef.current) {
            setOpen(false, createChangeEventDetails(REASONS.none, event));
          }

          // Saves a re-render on initial click: `forceMount === true` mounts
          // the items before `open === true`. We could sync those cycles better
          // without a timeout, but this is enough for now.
          //
          // XXX: might be causing `act()` warnings.
          timeoutFocus.start(0, () => {
            store.set('forceMount', true);
          });
        },
        onBlur(event: FocusEvent) {
          // If focus is moving into the popup, don't count it as a blur.
          if (contains(positionerElement(), event.relatedTarget as Element | null)) {
            return;
          }

          setTouched(true);
          setFocused(false);

          if (validationMode() === 'onBlur') {
            validation.commit(value());
          }
        },
        onPointerMove() {
          keyboardActiveRef.current = false;
        },
        onKeyDown() {
          keyboardActiveRef.current = true;
        },
        onMouseDown(event: MouseEvent) {
          if (open()) {
            return;
          }

          const doc = ownerDocument(event.currentTarget as Element | null);

          function handleMouseUp(mouseEvent: MouseEvent) {
            if (!triggerRef) {
              return;
            }

            const mouseUpTarget = mouseEvent.target as Element | null;

            // Early return if clicked on trigger element or its children
            if (
              contains(triggerRef, mouseUpTarget) ||
              contains(positionerRef, mouseUpTarget) ||
              mouseUpTarget === triggerRef
            ) {
              return;
            }

            const bounds = getPseudoElementBounds(triggerRef);

            if (
              mouseEvent.clientX >= bounds.left - BOUNDARY_OFFSET &&
              mouseEvent.clientX <= bounds.right + BOUNDARY_OFFSET &&
              mouseEvent.clientY >= bounds.top - BOUNDARY_OFFSET &&
              mouseEvent.clientY <= bounds.bottom + BOUNDARY_OFFSET
            ) {
              return;
            }

            setOpen(false, createChangeEventDetails(REASONS.cancelOpen, mouseEvent));
          }

          // Firefox can fire this upon mousedown
          timeoutMouseDown.start(0, () => {
            doc.addEventListener('mouseup', handleMouseUp, { once: true });
          });
        },
      },
      validation.getValidationProps,
      elementProps,
      getButtonProps,
      // ensure nested useButton does not overwrite the combobox role:
      // <Toolbar.Button render={<Select.Trigger />} />
      { role: 'combobox' },
    ),
  );

  const state: SelectTrigger.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
    get open() {
      return open();
    },
    get value() {
      return value();
    },
    get readOnly() {
      return readOnly();
    },
    get placeholder() {
      return !hasSelectedValue();
    },
  });

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      triggerRef = el;
    },
    stateAttributesMapping,
    get props() {
      return props();
    },
  });

  return <>{element()}</>;
}

export interface SelectTriggerState extends FieldRoot.State {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
  /**
   * Whether the select popup is readonly.
   */
  readOnly: boolean;
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the select doesn't have a value.
   */
  placeholder: boolean;
}

export interface SelectTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', SelectTrigger.State> {
  children?: JSX.Element;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean | undefined;
}

export namespace SelectTrigger {
  export type State = SelectTriggerState;
  export type Props = SelectTriggerProps;
}
