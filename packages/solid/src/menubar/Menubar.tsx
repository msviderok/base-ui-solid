import { createEffect, createSignal, onCleanup, onMount, type ParentProps } from 'solid-js';
import { CompositeRoot } from '../composite/root/CompositeRoot';
import {
  FloatingNode,
  FloatingTree,
  useFloatingNodeId,
  useFloatingTree,
} from '../floating-ui-solid';
import { type MenuRoot } from '../menu/root/MenuRoot';
import { MenuOpenEventDetails } from '../menu/utils/types';
import { splitComponentProps } from '../solid-helpers';
import { StateAttributesMapping } from '../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../utils/types';
import { useBaseUiId } from '../utils/useBaseUiId';
import { useOpenInteractionType } from '../utils/useOpenInteractionType';
import { useScrollLock } from '../utils/useScrollLock';
import { MenubarContext, useMenubarContext } from './MenubarContext';

const menubarStateAttributesMapping: StateAttributesMapping<Menubar.State> = {
  hasSubmenuOpen(value) {
    return {
      'data-has-submenu-open': value ? 'true' : 'false',
    };
  },
};

/**
 * The container for menus.
 *
 * Documentation: [Base UI Menubar](https://base-ui.com/react/components/menubar)
 */
export function Menubar(props: Menubar.Props) {
  const [renderProps, local, elementProps] = splitComponentProps(props, [
    'orientation',
    'loopFocus',
    'modal',
    'disabled',
    'id',
  ]);
  const orientation = () => local.orientation ?? 'horizontal';
  const loopFocus = () => local.loopFocus ?? true;
  const modal = () => local.modal ?? true;
  const disabled = () => local.disabled ?? false;
  const idProp = () => local.id;

  const [contentElement, setContentElement] = createSignal<HTMLElement | null | undefined>();
  const [hasSubmenuOpen, setHasSubmenuOpen] = createSignal(false);
  const [allowMouseUpTriggerRef, setAllowMouseUpTriggerRef] = createSignal(false);

  const {
    openMethod,
    triggerProps: interactionTypeProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(hasSubmenuOpen);

  createEffect(() => {
    if (!hasSubmenuOpen()) {
      resetOpenInteractionType();
    }
  });

  useScrollLock({
    enabled: () => modal() && hasSubmenuOpen() && openMethod() !== 'touch',
    referenceElement: contentElement,
  });

  const id = useBaseUiId(idProp);

  const state: Menubar.State = {
    get orientation() {
      return orientation();
    },
    get modal() {
      return modal();
    },
    get hasSubmenuOpen() {
      return hasSubmenuOpen();
    },
  };

  const context: MenubarContext = {
    contentElement,
    setContentElement,
    setHasSubmenuOpen,
    hasSubmenuOpen,
    modal,
    disabled,
    orientation,
    rootId: id,
    allowMouseUpTriggerRef,
    setAllowMouseUpTriggerRef,
  };

  return (
    <MenubarContext.Provider value={context}>
      <FloatingTree>
        <MenubarContent>
          <CompositeRoot
            render={renderProps.render}
            class={renderProps.class}
            state={state}
            stateAttributesMapping={menubarStateAttributesMapping}
            refs={[props.ref as any, setContentElement]}
            props={[
              {
                role: 'menubar',
                get id() {
                  return id();
                },
              },
              interactionTypeProps,
              elementProps,
            ]}
            orientation={orientation()}
            loopFocus={loopFocus()}
            highlightItemOnHover={hasSubmenuOpen()}
          />
        </MenubarContent>
      </FloatingTree>
    </MenubarContext.Provider>
  );
}

function MenubarContent(props: ParentProps) {
  const nodeId = useFloatingNodeId();
  const { events: menuEvents } = useFloatingTree()!;
  const rootContext = useMenubarContext();

  function onSubmenuOpenChange(details: MenuOpenEventDetails) {
    if (!details.nodeId || details.parentNodeId !== nodeId()) {
      return;
    }

    if (details.open) {
      if (!rootContext.hasSubmenuOpen()) {
        rootContext.setHasSubmenuOpen(true);
      }
    } else if (details.reason !== 'sibling-open' && details.reason !== 'list-navigation') {
      rootContext.setHasSubmenuOpen(false);
    }
  }

  onMount(() => {
    menuEvents.on('menuopenchange', onSubmenuOpenChange);
    onCleanup(() => {
      menuEvents.off('menuopenchange', onSubmenuOpenChange);
    });
  });

  return <FloatingNode id={nodeId()}>{props.children}</FloatingNode>;
}

export interface MenubarState {
  /**
   * The orientation of the menubar.
   */
  orientation: MenuRoot.Orientation;
  /**
   * Whether the menubar is modal.
   */
  modal: boolean;
  /**
   * Whether any submenu within the menubar is open.
   */
  hasSubmenuOpen: boolean;
}

export interface MenubarProps extends BaseUIComponentProps<'div', Menubar.State> {
  /**
   * Whether the menubar is modal.
   * @default true
   */
  modal?: boolean;
  /**
   * Whether the whole menubar is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * The orientation of the menubar.
   * @default 'horizontal'
   */
  orientation?: MenuRoot.Orientation;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean;
}

export namespace Menubar {
  export type State = MenubarState;
  export type Props = MenubarProps;
}
