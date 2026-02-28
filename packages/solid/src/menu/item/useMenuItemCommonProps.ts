import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { type ReactLikeRef } from '../../solid-helpers';
import { REASONS } from '../../utils/reasons';
import { HTMLProps } from '../../utils/types';
import { MenuStore } from '../store/MenuStore';
import type { UseMenuItemMetadata } from './useMenuItem';

export interface UseMenuItemCommonPropsParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: boolean;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: boolean;
  /**
   * The id of the menu item.
   */
  id: string | undefined;
  /**
   * The node id of the menu positioner.
   */
  nodeId: string | undefined;
  /**
   * The menu store.
   */
  store: MenuStore<any>;
  /**
   * Ref to the item element.
   */
  itemRef: ReactLikeRef<HTMLElement | null | undefined> | undefined;
  /**
   * Optional metadata for checking item type before triggering click.
   * If provided, click will only be triggered for 'regular-item' type.
   */
  itemMetadata?: UseMenuItemMetadata | undefined;
}

/**
 * Returns common props shared by all menu item types.
 * This hook extracts the shared logic for id, role, tabIndex, onMouseMove, onClick, and onMouseUp handlers.
 */
export function useMenuItemCommonProps(params: UseMenuItemCommonPropsParameters): HTMLProps {
  const treeRoot = params.store.useState('floatingTreeRoot');
  const contextMenuContext = useContextMenuRootContext(true);
  const isContextMenu = contextMenuContext !== undefined;

  return {
    get id() {
      return params.id;
    },
    role: 'menuitem',
    get tabIndex() {
      return params.highlighted ? 0 : -1;
    },
    onMouseMove(event) {
      if (!params.nodeId) {
        return;
      }

      // Inform the floating tree that a menu item within this menu was hovered/moved over
      // so unrelated descendant submenus can be closed.
      treeRoot().events.emit('itemhover', {
        nodeId: params.nodeId,
        target: event.currentTarget,
      });
    },
    onClick(event) {
      if (params.closeOnClick) {
        treeRoot().events.emit('close', { domEvent: event, reason: REASONS.itemPress });
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
        params.itemRef &&
        params.store.context.allowMouseUpTriggerRef.current &&
        (!isContextMenu || event.button === 2)
      ) {
        // This fires whenever the user clicks on the trigger, moves the cursor, and releases it over the item.
        // We trigger the click and override the `closeOnClick` preference to always close the menu.
        if (!params.itemMetadata || params.itemMetadata.type === 'regular-item') {
          params.itemRef.current?.click();
        }
      }
    },
  };
}

export namespace useMenuItemCommonProps {
  export type Parameters = UseMenuItemCommonPropsParameters;
}
