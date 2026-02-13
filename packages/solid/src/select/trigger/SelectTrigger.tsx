import { ownerDocument } from '@base-ui/utils/owner';
import {
  batch,
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
import { mergeProps } from '../../merge-props';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { getPseudoElementBounds } from '../../utils/getPseudoElementBounds';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { pressableTriggerOpenStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTimeout } from '../../utils/useTimeout';
import { useSelectRootContext } from '../root/SelectRootContext';

const BOUNDARY_OFFSET = 2;

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
  const [, local, elementProps] = splitComponentProps(componentProps, ['disabled', 'nativeButton']);
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
    refs,
    validation,
    readOnly,
    required,
    disabled: selectDisabled,
  } = useSelectRootContext();

  const disabled = () => fieldDisabled() || selectDisabled() || disabledProp();

  const open = store.useState('open');
  const value = store.useState('value');
  const triggerProps = store.useState('triggerProps');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const serializedValue = store.useState('serializedValue');

  let positionerRef = positionerElement();

  let triggerRef = null as HTMLElement | null | undefined;
  const timeoutFocus = useTimeout();
  const timeoutMouseDown = useTimeout();

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const setTriggerElement = (element: HTMLElement | null | undefined) => {
    store.set('triggerElement', element);
  };

  const timeout1 = useTimeout();
  const timeout2 = useTimeout();

  createEffect(() => {
    if (open()) {
      // mousedown -> move to unselected item -> mouseup should not select within 200ms.
      timeout2.start(200, () => {
        refs.selectionRef.allowUnselectedMouseUp = true;

        // mousedown -> mouseup on selected item should not select within 400ms.
        timeout1.start(200, () => {
          refs.selectionRef.allowSelectedMouseUp = true;
        });
      });

      onCleanup(() => {
        timeout1.clear();
        timeout2.clear();
      });
    }

    refs.selectionRef = {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
    };

    timeoutMouseDown.clear();
  });

  const ariaControlsId = createMemo(() => {
    return listElement()?.id ?? getFloatingFocusElement(positionerElement())?.id;
  });

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
      return !serializedValue();
    },
  });

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      triggerRef = el;
      buttonRef(el);
      setTriggerElement(el);
    },
    props: [
      (props) => mergeProps(props, triggerProps()),
      {
        role: 'combobox',
        get 'aria-expanded'() {
          return open() ? 'true' : 'false';
        },
        'aria-haspopup': 'listbox',
        get 'aria-controls'() {
          return open() ? ariaControlsId() : undefined;
        },
        get 'aria-labelledby'() {
          return labelId();
        },
        get 'aria-readonly'() {
          return readOnly() || undefined;
        },
        get 'aria-required'() {
          return required() || undefined;
        },
        get tabIndex() {
          return disabled() ? -1 : 0;
        },
        onFocus(event) {
          setFocused(true);
          // The popup element shouldn't obscure the focused trigger.
          if (open() && refs.alignItemWithTriggerActiveRef) {
            setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
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
        onBlur() {
          batch(() => {
            setTouched(true);
            setFocused(false);

            if (validationMode() === 'onBlur') {
              validation.commit(value());
            }
          });
        },
        onPointerMove() {
          refs.keyboardActiveRef = false;
        },
        onKeyDown() {
          refs.keyboardActiveRef = true;
        },
        onMouseDown(event) {
          if (open()) {
            return;
          }

          const doc = ownerDocument(event.currentTarget);

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
    ],
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export interface SelectTriggerState extends FieldRoot.State {
  /** Whether the select popup is currently open. */
  open: boolean;
  /** Whether the select popup is readonly. */
  readOnly: boolean;
  /** The value of the currently selected item. */
  value: any;
}

export interface SelectTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', SelectTrigger.State> {
  children?: JSX.Element;
  /** Whether the component should ignore user interaction. */
  disabled?: boolean;
}

export namespace SelectTrigger {
  export type State = SelectTriggerState;
  export type Props = SelectTriggerProps;
}
