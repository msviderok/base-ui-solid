import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { mergeProps } from '../../merge-props';
import { access, MaybeAccessor } from '../../solid-helpers';
import { useButton } from '../../use-button';
import { REASONS } from '../../utils/reasons';
import { BaseUIEvent, type BaseUIHTMLProps, type HTMLProps } from '../../utils/types';
import { MenuStore } from '../store/MenuStore';

export const REGULAR_ITEM = {
  type: 'regular-item' as const,
};

export function useMenuItem(params: useMenuItem.Parameters): useMenuItem.ReturnValue {
  const closeOnClick = () => access(params.closeOnClick);
  const disabled = () => access(params.disabled) ?? false;
  const highlighted = () => access(params.highlighted);
  const id = () => access(params.id);
  const nativeButton = () => access(params.nativeButton);
  const itemMetadata = () => access(params.itemMetadata);
  const nodeId = () => access(params.nodeId);

  let itemRef = null as HTMLElement | null | undefined;
  const contextMenuContext = useContextMenuRootContext(true);
  const isContextMenu = contextMenuContext !== undefined;
  const { events: menuEvents } = params.store.select('floatingTreeRoot');

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
  });

  const getItemProps = (externalProps: HTMLProps | BaseUIHTMLProps = {}) => {
    return mergeProps<'div'>([
      {
        get id() {
          return id();
        },
        role: 'menuitem',
        get tabIndex() {
          return highlighted() ? 0 : -1;
        },
        onMouseMove(event) {
          if (!nodeId()) {
            return;
          }

          // Inform the floating tree that a menu item within this menu was hovered/moved over
          // so unrelated descendant submenus can be closed.
          menuEvents.emit('itemhover', {
            nodeId: nodeId(),
            target: event.currentTarget,
          });
        },
        onMouseEnter() {
          const metadata = itemMetadata();
          if (metadata.type !== 'submenu-trigger') {
            return;
          }

          metadata.setActive();
        },
        onKeyUp(event: BaseUIEvent<KeyboardEvent>) {
          if (event.key === ' ' && params.store.context.refs.typingRef) {
            event.preventBaseUIHandler();
          }
        },
        /**
         * TODO: this is needed in order to propagate the keydown event to the button
         * (for example, test MenuRadioItem#L162-L190 for "Enter" key)
         */
        onKeyDown: () => {},
        onClick(event) {
          if (closeOnClick()) {
            menuEvents.emit('close', { domEvent: event, reason: REASONS.itemPress });
          }
        },
        onMouseUp(event) {
          if (contextMenuContext) {
            const initialCursorPoint = contextMenuContext.refs.initialCursorPointRef;
            contextMenuContext.refs.initialCursorPointRef = null;
            if (
              isContextMenu &&
              initialCursorPoint &&
              Math.abs(event.clientX - initialCursorPoint.x) <= 1 &&
              Math.abs(event.clientY - initialCursorPoint.y) <= 1
            ) {
              return;
            }
          }

          if (
            itemRef &&
            params.store.context.refs.allowMouseUpTriggerRef &&
            (!isContextMenu || event.button === 2)
          ) {
            // This fires whenever the user clicks on the trigger, moves the cursor, and releases it over the item.
            // We trigger the click and override the `closeOnClick` preference to always close the menu.
            if (itemMetadata().type === 'regular-item') {
              itemRef?.click();
            }
          }
        },
      },
      externalProps,
      getButtonProps,
    ]);
  };

  return {
    getItemProps,
    setItemRef: (el) => {
      itemRef = el;
      buttonRef(el);
    },
  };
}

export interface UseMenuItemParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: MaybeAccessor<boolean>;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: MaybeAccessor<boolean>;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: MaybeAccessor<boolean>;
  /**
   * The id of the menu item.
   */
  id: MaybeAccessor<string | undefined>;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (e.g. `<div>`).
   * @default false
   */
  nativeButton: MaybeAccessor<boolean>;
  /**
   * Additional data specific to the item type.
   */
  itemMetadata: MaybeAccessor<UseMenuItemMetadata>;
  /**
   * The node id of the menu positioner.
   */
  nodeId: MaybeAccessor<string | undefined>;
  /**
   * The menu store.
   */
  store: MenuStore<any>;
}

export type UseMenuItemMetadata =
  | typeof REGULAR_ITEM
  | {
      type: 'submenu-trigger';
      setActive: () => void;
    };

export interface UseMenuItemReturnValue {
  /**
   * Resolver for the root slot's props.
   * @param externalProps event handlers for the root slot
   * @returns props that should be spread on the root slot
   */
  getItemProps: (externalProps?: HTMLProps | BaseUIHTMLProps) => BaseUIHTMLProps;
  /**
   * The ref to the component's root DOM element.
   */
  setItemRef: (el: HTMLElement | null | undefined) => void;
}

export namespace useMenuItem {
  export type Parameters = UseMenuItemParameters;
  export type Metadata = UseMenuItemMetadata;
  export type ReturnValue = UseMenuItemReturnValue;
}
