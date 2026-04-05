import { useCompositeListItem } from '../../composite/list/useCompositeListItem';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuItem(componentProps: MenuItem.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'id',
    'label',
    'nativeButton',
    'disabled',
    'closeOnClick',
  ]);
  const idProp = () => local.id;
  const nativeButton = () => local.nativeButton ?? false;
  const disabled = () => local.disabled ?? false;
  const closeOnClick = () => local.closeOnClick ?? true;

  const listItem = useCompositeListItem({
    get label() {
      return local.label;
    },
  });
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const { store } = useMenuRootContext();
  const highlighted = store.useState('isActive', listItem.index);
  const itemProps = store.useState('itemProps');

  const { getItemProps, setItemRef } = useMenuItem({
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    nativeButton,
    nodeId: menuPositionerContext?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const state: MenuItem.State = {
    get disabled() {
      return disabled();
    },
    get highlighted() {
      return highlighted();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    get props() {
      return [itemProps(), elementProps, getItemProps];
    },
    ref: (el) => {
      setItemRef(el);
      listItem.setRef(el);
    },
  });

  return <>{element()}</>;
}

export interface MenuItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuItem.State> {
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuItemState>['onClick'] | undefined;
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
   *
   * @default true
   */
  closeOnClick?: boolean | undefined;
}

export namespace MenuItem {
  export type State = MenuItemState;
  export type Props = MenuItemProps;
}
