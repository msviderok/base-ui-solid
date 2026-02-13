import { type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useControlled } from '../../utils/useControlled';
import { useRenderElement } from '../../utils/useRenderElement';
import type { MenuRoot } from '../root/MenuRoot';
import { MenuRadioGroupContext } from './MenuRadioGroupContext';

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRadioGroup(componentProps: MenuRadioGroup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'value',
    'defaultValue',
    'onValueChange',
    'disabled',
  ]);
  const disabled = () => local.disabled ?? false;

  const [value, setValueUnwrapped] = useControlled({
    controlled: () => local.value,
    default: () => local.defaultValue,
    name: 'MenuRadioGroup',
  });

  const setValue = (newValue: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => {
    local.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(newValue);
  };

  const state: MenuRadioGroup.State = {
    get disabled() {
      return disabled();
    },
  };

  const context: MenuRadioGroupContext = {
    value,
    setValue,
    disabled,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      {
        role: 'group',
        get 'aria-disabled'() {
          return disabled() || undefined;
        },
      },
      elementProps,
    ],
  });

  return (
    <MenuRadioGroupContext.Provider value={context}>{element()}</MenuRadioGroupContext.Provider>
  );
}

export interface MenuRadioGroupProps extends BaseUIComponentProps<'div', MenuRadioGroup.State> {
  /**
   * The content of the component.
   */
  children?: JSX.Element;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio item that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: any;
  /**
   * Function called when the selected value changes.
   */
  onValueChange?: (value: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => void;
  /**
   * Whether the component should ignore user interaction.
   *
   * @default false
   */
  disabled?: boolean;
}

export type MenuRadioGroupState = {
  disabled: boolean;
};

export type MenuRadioGroupChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuRadioGroupChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuRadioGroup {
  export type Props = MenuRadioGroupProps;
  export type State = MenuRadioGroupState;
  export type ChangeEventReason = MenuRadioGroupChangeEventReason;
  export type ChangeEventDetails = MenuRadioGroupChangeEventDetails;
}
