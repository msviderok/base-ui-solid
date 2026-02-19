'use client';
import { useControlled } from '@base-ui/utils/useControlled';
import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { splitComponentProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { REGULAR_ITEM, useMenuItem } from '../item/useMenuItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useMenuRootContext } from '../root/MenuRootContext';
import { itemMapping } from '../utils/stateAttributesMapping';
import { MenuCheckboxItemContext } from './MenuCheckboxItemContext';

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuCheckboxItem(componentProps: MenuCheckboxItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'id',
    'label',
    'nativeButton',
    'disabled',
    'closeOnClick',
    'checked',
    'defaultChecked',
    'onCheckedChange',
  ]);
  const idProp = () => local.id;
  const nativeButton = () => local.nativeButton ?? false;
  const disabled = () => local.disabled ?? false;
  const closeOnClick = () => local.closeOnClick ?? false;
  const checkedProp = () => local.checked ?? false;
  const defaultChecked = () => local.defaultChecked;

  const listItem = useCompositeListItem({ label: () => local.label });
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const { store } = useMenuRootContext();
  const highlighted = store.useState('isActive', listItem.index);
  const itemProps = store.useState('itemProps');

  const [checked, setChecked] = useControlled({
    controlled: checkedProp,
    default: () => defaultChecked() ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked',
  });

  const { getItemProps, setItemRef } = useMenuItem({
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    nativeButton,
    nodeId: () => menuPositionerContext?.nodeId(),
    itemMetadata: REGULAR_ITEM,
  });

  const state: MenuCheckboxItem.State = {
    get disabled() {
      return disabled();
    },
    get highlighted() {
      return highlighted();
    },
    get checked() {
      return checked();
    },
  };

  const contextValue: MenuCheckboxItemContext = {
    disabled,
    highlighted,
    checked,
  };

  const handleClick = (event: MouseEvent) => {
    const details = {
      ...createChangeEventDetails(REASONS.itemPress, event),
      preventUnmountOnClose: () => {},
    };

    local.onCheckedChange?.(!checked(), details);

    if (details.isCanceled) {
      return;
    }

    setChecked(() => !checked());
  };

  const element = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: itemMapping,
    get props() {
      return [
        itemProps(),
        {
          role: 'menuitemcheckbox',
          get 'aria-checked'() {
            return checked();
          },
          onClick: handleClick,
        },
        elementProps,
        getItemProps,
      ];
    },
    ref: (el) => {
      setItemRef(el);
      listItem.setRef(el);
    },
  });

  return (
    <MenuCheckboxItemContext.Provider value={contextValue}>
      {element()}
    </MenuCheckboxItemContext.Provider>
  );
}

export type MenuCheckboxItemState = {
  /**
   * Whether the checkbox item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the checkbox item is currently highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
};

export interface MenuCheckboxItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuCheckboxItem.State> {
  /**
   * Whether the checkbox item is currently ticked.
   *
   * To render an uncontrolled checkbox item, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox item is initially ticked.
   *
   * To render a controlled checkbox item, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Event handler called when the checkbox item is ticked or unticked.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: MenuCheckboxItem.ChangeEventDetails) => void)
    | undefined;
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuCheckboxItemState>['onClick'] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether to close the menu when the item is clicked.
   * @default false
   */
  closeOnClick?: boolean | undefined;
}

export type MenuCheckboxItemChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuCheckboxItemChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuCheckboxItem {
  export type State = MenuCheckboxItemState;
  export type Props = MenuCheckboxItemProps;
  export type ChangeEventReason = MenuCheckboxItemChangeEventReason;
  export type ChangeEventDetails = MenuCheckboxItemChangeEventDetails;
}
