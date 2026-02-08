import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  mergeProps as solidMergeProps,
  splitProps,
} from 'solid-js';
import { useCheckboxGroupContext } from '../../checkbox-group/CheckboxGroupContext';
import { useFieldItemContext } from '../../field/item/FieldItemContext';
import type { FieldRoot } from '../../field/root/FieldRoot';
import { useFieldRootContext } from '../../field/root/FieldRootContext';
import { useField } from '../../field/useField';
import { useFormContext } from '../../form/FormContext';
import { useLabelableContext } from '../../labelable-provider/LabelableContext';
import { mergeProps } from '../../merge-props';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import {
  BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { NOOP } from '../../utils/noop';
import { REASONS } from '../../utils/reasons';
import type {
  BaseUIComponentProps,
  BaseUIHTMLProps,
  NonNativeButtonProps,
} from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import { visuallyHiddenInput } from '../../utils/visuallyHidden';
import { useStateAttributesMapping } from '../utils/useStateAttributesMapping';
import { CheckboxRootContext } from './CheckboxRootContext';

export const PARENT_CHECKBOX = 'data-parent';

/**
 * Represents the checkbox itself.
 * Renders a `<span>` element and a hidden `<input>` beside.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxRoot(componentProps: CheckboxRoot.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'checked',
    'defaultChecked',
    'disabled',
    'id',
    'indeterminate',
    'inputRef',
    'name',
    'onCheckedChange',
    'parent',
    'readOnly',
    'render',
    'required',
    'uncheckedValue',
    'value',
    'nativeButton',
  ]);
  const checkedProp = () => local.checked;
  const defaultChecked = () => local.defaultChecked ?? false;
  const disabledProp = () => local.disabled ?? false;
  const idProp = () => local.id;
  const indeterminate = () => local.indeterminate ?? false;
  const inputRefProp = () => local.inputRef;
  const nameProp = () => local.name;
  const parent = () => local.parent ?? false;
  const readOnly = () => local.readOnly ?? false;
  const required = () => local.required ?? false;
  const valueProp = () => local.value;
  const nativeButton = () => local.nativeButton ?? false;

  const { clearErrors } = useFormContext();
  const {
    disabled: rootDisabled,
    name: fieldName,
    setDirty,
    setFilled,
    setFocused,
    setTouched,
    state: fieldState,
    validationMode,
    validityData,
    shouldValidateOnChange,
    validation: localValidation,
  } = useFieldRootContext();
  const fieldItemContext = useFieldItemContext();
  const { labelId, controlId, setControlId, getDescriptionProps } = useLabelableContext();

  const groupContext = useCheckboxGroupContext();
  const parentContext = () => groupContext?.parent;
  const isGroupedWithParent = createMemo(() => parentContext() && groupContext?.allValues());

  const disabled = () =>
    rootDisabled() || fieldItemContext.disabled() || groupContext?.disabled() || disabledProp();
  const name = () => fieldName() ?? nameProp();
  const value = () => valueProp() ?? name();

  const id = useBaseUiId();

  const parentId = useBaseUiId();
  const inputId = createMemo(() => {
    if (isGroupedWithParent()) {
      return parent() ? parentId() : `${parentContext()!.id()}-${value()}`;
    }
    if (idProp()) {
      return idProp();
    }
    return controlId();
  });

  const groupProps = createMemo(() => {
    let mainProps = {} as Partial<Omit<CheckboxRoot.Props, 'class'>>;
    if (isGroupedWithParent()) {
      if (parent()) {
        mainProps = groupContext!.parent.getParentProps();
      }

      if (value()) {
        mainProps = groupContext!.parent.getChildProps(value()!);
      }
    }

    const [localGroup, otherGorup] = splitProps(mainProps, [
      'checked',
      'indeterminate',
      'onCheckedChange',
    ]);
    return {
      other: otherGorup,
      local: {
        get checked() {
          return localGroup.checked ?? checkedProp();
        },
        get indeterminate() {
          return localGroup.indeterminate ?? indeterminate();
        },
        // eslint-disable-next-line solid/reactivity
        onCheckedChange: localGroup.onCheckedChange,
      },
    };
  });

  const groupValue = () => groupContext?.value();
  const setGroupValue = groupContext?.setValue;
  const defaultGroupValue = () => groupContext?.defaultValue();

  const [controlRef, setControlRef] = createSignal<HTMLButtonElement | null | undefined>(null);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const validation = () => groupContext?.validation ?? localValidation;

  const [checked, setCheckedState] = useControlled({
    controlled: () => {
      return value() && groupValue() && !parent()
        ? groupValue()!.includes(value()!)
        : groupProps().local.checked;
    },
    default: () =>
      value() && defaultGroupValue() && !parent()
        ? defaultGroupValue()!.includes(value()!)
        : defaultChecked(),
    name: 'Checkbox',
    state: 'checked',
  });

  // can't use useLabelableId because of optional groupContext and/or parent
  createEffect(
    on([inputId, () => groupContext, parent], () => {
      if (setControlId === NOOP) {
        return;
      }

      setControlId(inputId());

      onCleanup(() => {
        setControlId(undefined);
      });
    }),
  );

  useField({
    enabled: () => !groupContext,
    id,
    commit: (...args) => validation().commit(...args),
    value: checked,
    controlRef,
    name,
    getValue: () => checked(),
  });

  let inputRef = null as HTMLInputElement | null | undefined;

  createEffect(() => {
    if (inputRef) {
      inputRef.indeterminate = groupProps().local.indeterminate;
      if (checked()) {
        setFilled(true);
      }
    }
  });

  createEffect(
    on(checked, () => {
      if (groupContext && !parent) {
        return;
      }

      clearErrors(name());
      setFilled(checked);
      setDirty(checked !== validityData.initialValue);

      if (shouldValidateOnChange()) {
        validation().commit(checked);
      } else {
        validation().commit(checked, true);
      }
    }),
  );

  const inputProps = createMemo<BaseUIHTMLProps<HTMLInputElement>>(() => {
    return mergeProps<'input'>(
      {
        get checked() {
          return checked();
        },
        get disabled() {
          return disabled();
        },
        // parent checkboxes unset `name` to be excluded from form submission
        get name() {
          return parent() ? undefined : name();
        },
        // Set `id` to stop Chrome warning about an unassociated input
        get id() {
          return nativeButton() ? undefined : (inputId() ?? undefined);
        },
        get required() {
          return required();
        },
        ref: (el) => {
          inputRef = el;
          validation().inputRef = el;
        },
        style: visuallyHiddenInput,
        tabIndex: -1,
        type: 'checkbox',
        'aria-hidden': true,
        onChange(event) {
          const groupContextValue = groupContext?.value();
          // Workaround for https://github.com/facebook/react/issues/9023
          if (event.defaultPrevented) {
            return;
          }

          batch(() => {
            const nextChecked = event.target.checked;
            const details = createChangeEventDetails(REASONS.none, event);

            groupProps().local.onCheckedChange?.(nextChecked, details);
            local.onCheckedChange?.(nextChecked, details);

            if (details.isCanceled) {
              return;
            }

            setCheckedState(nextChecked);

            if (value() && groupContextValue && setGroupValue && !parent()) {
              const nextGroupValue = nextChecked
                ? [...groupContextValue!, value()!]
                : groupContextValue!.filter((item) => item !== value());

              setGroupValue(nextGroupValue, details);
            }
          });
        },
        onFocus() {
          controlRef()?.focus();
        },
        // React <19 sets an empty value if `undefined` is passed explicitly
        // To avoid this, we only set the value if it's defined
        get value() {
          return valueProp() !== undefined
            ? (groupContext ? checked() && local.value : local.value) || ''
            : undefined;
        },
      },

      getDescriptionProps,
      groupContext ? validation().getValidationProps : validation().getInputValidationProps,
    );
  });
  const computedChecked = () =>
    isGroupedWithParent() ? Boolean(groupProps().local.checked) : checked();
  const computedIndeterminate = () =>
    isGroupedWithParent() ? groupProps().local.indeterminate || indeterminate() : indeterminate();

  createEffect(() => {
    if (parentContext() && value()) {
      parentContext()?.disabledStatesRef.set(value()!, disabled());
    }
  });

  const state: CheckboxRoot.State = solidMergeProps(fieldState, {
    get disabled() {
      return disabled();
    },
    get checked() {
      return computedChecked();
    },
    get readOnly() {
      return readOnly();
    },
    get required() {
      return required();
    },
    get indeterminate() {
      return computedIndeterminate();
    },
  });

  const stateAttributesMapping = useStateAttributesMapping(state);

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      buttonRef(el);
      setControlRef(el);
      groupContext?.registerControlRef(el);
    },
    props: [
      {
        get id() {
          return nativeButton() ? (inputId() ?? undefined) : id();
        },
        role: 'checkbox',
        get 'aria-checked'() {
          return groupProps().local.indeterminate ? 'mixed' : checked();
        },
        get 'aria-readonly'() {
          return readOnly() || undefined;
        },
        get 'aria-required'() {
          return required() || undefined;
        },
        get 'aria-labelledby'() {
          return labelId();
        },
        get [PARENT_CHECKBOX as string]() {
          return parent() ? '' : undefined;
        },
        onFocus() {
          setFocused(true);
        },
        onBlur() {
          if (!inputRef) {
            return;
          }

          batch(() => {
            setTouched(true);
            setFocused(false);

            if (validationMode() === 'onBlur') {
              validation().commit(groupContext ? groupValue() : inputRef!.checked);
            }
          });
        },
        onClick(event) {
          if (readOnly() || disabled()) {
            return;
          }

          event.preventDefault();

          inputRef?.click();
        },
      },
      getDescriptionProps,
      (props) => validation().getValidationProps(props),
      elementProps,
      (props) => mergeProps(props, groupProps().other),
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  return (
    <CheckboxRootContext.Provider value={state}>
      {element()}
      {!checked() && !groupContext && name() && !parent() && local.uncheckedValue !== undefined && (
        <input type="hidden" name={name()} value={local.uncheckedValue} />
      )}
      <input {...(inputProps() as any)} />
    </CheckboxRootContext.Provider>
  );
}

export interface CheckboxRootState extends FieldRoot.State {
  /**
   * Whether the checkbox is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   */
  required: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   */
  indeterminate: boolean;
}

export interface CheckboxRootProps
  extends
    NonNativeButtonProps,
    Omit<BaseUIComponentProps<'span', CheckboxRoot.State>, 'onChange' | 'value'> {
  /**
   * The id of the input element.
   */
  id?: string;
  /**
   * Identifies the field when a form is submitted.
   * @default undefined
   */
  name?: string;
  /**
   * Whether the checkbox is currently ticked.
   *
   * To render an uncontrolled checkbox, use the `defaultChecked` prop instead.
   * @default undefined
   */
  checked?: boolean;
  /**
   * Whether the checkbox is initially ticked.
   *
   * To render a controlled checkbox, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * Event handler called when the checkbox is ticked or unticked.
   *
   * @param {boolean} checked The new checked state.
   * @param {Event} event The corresponding event that initiated the change.
   */
  onCheckedChange?: (checked: boolean, eventDetails: CheckboxRootChangeEventDetails) => void;
  /**
   * Whether the user should be unable to tick or untick the checkbox.
   * @default false
   */
  readOnly?: boolean;
  /**
   * Whether the user must tick the checkbox before submitting a form.
   * @default false
   */
  required?: boolean;
  /**
   * Whether the checkbox is in a mixed state: neither ticked, nor unticked.
   * @default false
   */
  indeterminate?: boolean;
  /**
   * A ref to access the hidden `<input>` element.
   */
  inputRef?: HTMLInputElement | null | undefined;
  /**
   * Whether the checkbox controls a group of child checkboxes.
   *
   * Must be used in a [Checkbox Group](https://base-ui.com/react/components/checkbox-group).
   * @default false
   */
  parent?: boolean;
  /**
   * The value submitted with the form when the checkbox is unchecked.
   * By default, unchecked checkboxes do not submit any value, matching native checkbox behavior.
   */
  uncheckedValue?: string;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default true
   */
  nativeButton?: boolean;
  /**
   * The value of the selected checkbox.
   */
  value?: string;
}

export type CheckboxRootChangeEventReason = typeof REASONS.none;
export type CheckboxRootChangeEventDetails =
  BaseUIChangeEventDetails<CheckboxRoot.ChangeEventReason>;

export namespace CheckboxRoot {
  export type State = CheckboxRootState;
  export type Props = CheckboxRootProps;
  export type ChangeEventReason = CheckboxRootChangeEventReason;
  export type ChangeEventDetails = CheckboxRootChangeEventDetails;
}
