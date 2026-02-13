import { Menu } from '../../menu';
import type { MenuRoot } from '../../menu/root/MenuRoot';
import { MenuRootContext } from '../../menu/root/MenuRootContext';
import type { BaseUIChangeEventDetails } from '../../types';
import { useId } from '../../utils/useId';
import { ContextMenuRootContext } from './ContextMenuRootContext';

/**
 * A component that creates a context menu activated by right clicking or long pressing.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export function ContextMenuRoot(props: ContextMenuRoot.Props) {
  const anchor: ContextMenuRootContext['anchor'] = {
    getBoundingClientRect() {
      return DOMRect.fromRect({ width: 0, height: 0, x: 0, y: 0 });
    },
  };

  const refs: ContextMenuRootContext['refs'] = {
    backdropRef: null,
    internalBackdropRef: null,
    actionsRef: null,
    positionerRef: null,
    allowMouseUpTriggerRef: true,
    initialCursorPointRef: null,
  };

  const id = useId();

  const contextValue: ContextMenuRootContext = {
    anchor,
    refs,
    rootId: id,
  };

  return (
    <ContextMenuRootContext.Provider value={contextValue}>
      <MenuRootContext.Provider value={undefined}>
        <Menu.Root {...props} />
      </MenuRootContext.Provider>
    </ContextMenuRootContext.Provider>
  );
}

export interface ContextMenuRootState {}

export interface ContextMenuRootProps extends Omit<
  Menu.Root.Props,
  'modal' | 'openOnHover' | 'delay' | 'closeDelay' | 'onOpenChange'
> {
  /**
   * Event handler called when the menu is opened or closed.
   */
  onOpenChange?: (open: boolean, eventDetails: ContextMenuRoot.ChangeEventDetails) => void;
}

export type ContextMenuRootChangeEventReason = MenuRoot.ChangeEventReason;
export type ContextMenuRootChangeEventDetails =
  BaseUIChangeEventDetails<ContextMenuRoot.ChangeEventReason>;

export namespace ContextMenuRoot {
  export type State = ContextMenuRootState;
  export type Props = ContextMenuRootProps;
  export type ChangeEventReason = ContextMenuRootChangeEventReason;
  export type ChangeEventDetails = ContextMenuRootChangeEventDetails;
}
