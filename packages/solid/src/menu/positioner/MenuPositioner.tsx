import { createEffect, createMemo, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { CompositeList } from '../../composite/list/CompositeList';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { FloatingNode } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '../../utils/constants';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { BaseUIComponentProps, type HTMLProps } from '../../utils/types';
import { useAnchorPositioning, type Align, type Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useMenuPortalContext } from '../portal/MenuPortalContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuOpenEventDetails } from '../utils/types';
import { MenuPositionerContext } from './MenuPositionerContext';

/**
 * Positions the menu popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPositioner(componentProps: MenuPositioner.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'anchor',
    'positionMethod',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionBoundary',
    'collisionPadding',
    'arrowPadding',
    'sticky',
    'disableAnchorTracking',
    'collisionAvoidance',
  ]);
  const anchorProp = () => local.anchor;
  const positionMethodProp = () => local.positionMethod ?? 'absolute';
  const alignProp = () => local.align;
  const sideOffsetProp = () => local.sideOffset ?? 0;
  const alignOffsetProp = () => local.alignOffset ?? 0;
  const collisionBoundary = () => local.collisionBoundary ?? 'clipping-ancestors';
  const collisionPadding = () => local.collisionPadding ?? 5;
  const arrowPadding = () => local.arrowPadding ?? 5;
  const sticky = () => local.sticky ?? false;
  const disableAnchorTracking = () => local.disableAnchorTracking ?? false;
  const collisionAvoidanceProp = () => local.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;

  const { store } = useMenuRootContext();

  const keepMounted = useMenuPortalContext();
  const contextMenuContext = useContextMenuRootContext(true);

  const parent = store.useState('parent');
  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const modal = store.useState('modal');
  const triggerElement = store.useState('activeTriggerElement');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const floatingNodeId = store.useState('floatingNodeId');
  const floatingParentNodeId = store.useState('floatingParentNodeId');

  const anchor = createMemo(() => {
    const val = anchorProp();
    const p = parent();
    return val ?? (p.type === 'context-menu' ? (p.context?.anchor ?? val) : val);
  });

  const align = createMemo(() => {
    const val = alignProp();
    const p = parent();
    return val ?? (p.type === 'context-menu' ? 'start' : val);
  });

  const sideOffset = createMemo(() => {
    const val = sideOffsetProp();
    const p = parent();
    return p.type === 'context-menu' && !local.side && align() !== 'center'
      ? (componentProps.sideOffset ?? -5)
      : val;
  });

  const alignOffset = createMemo(() => {
    const val = alignOffsetProp();
    const p = parent();
    return p.type === 'context-menu' && !local.side && align() !== 'center'
      ? (componentProps.alignOffset ?? 2)
      : val;
  });

  const computedSide = createMemo(() => {
    const p = parent();
    if (p.type === 'menu') {
      return local.side ?? 'inline-end';
    }
    if (p.type === 'menubar') {
      return local.side ?? 'bottom';
    }
    return local.side;
  });

  const computedAlign = createMemo(() => {
    const p = parent();
    return p.type === 'menu' || p.type === 'menubar' ? (align() ?? 'start') : align();
  });

  const collisionAvoidance = createMemo(() => {
    const p = parent();
    return p.type === 'menu'
      ? (componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE)
      : collisionAvoidanceProp();
  });

  const contextMenu = () => parent().type === 'context-menu';

  const positioner = useAnchorPositioning({
    anchor,
    get floatingRootContext() {
      return store.context.floatingRootContext;
    },
    positionMethod: () => (contextMenuContext ? 'fixed' : positionMethodProp()),
    mounted,
    side: computedSide,
    sideOffset,
    align: computedAlign,
    alignOffset,
    arrowPadding: () => (contextMenu() ? 0 : arrowPadding()),
    collisionBoundary,
    collisionPadding,
    sticky,
    nodeId: floatingNodeId,
    keepMounted,
    disableAnchorTracking,
    collisionAvoidance,
    shiftCrossAxis: () => {
      const ca = collisionAvoidance();
      return contextMenu() && !('side' in ca && ca.side === 'flip');
    },
    get externalTree() {
      return store.context.floatingTreeRoot;
    },
  });

  const positionerProps: HTMLProps = {
    role: 'presentation',
    get hidden() {
      return !mounted();
    },
    get style() {
      const hiddenStyles: JSX.CSSProperties = {};

      if (!open()) {
        hiddenStyles['pointer-events'] = 'none';
      }

      return {
        ...positioner.positionerStyles(),
        ...hiddenStyles,
      };
    },
  };

  function onMenuOpenChange(details: MenuOpenEventDetails) {
    if (details.open) {
      if (details.parentNodeId === floatingNodeId()) {
        store.set('hoverEnabled', false);
      }
      if (
        details.nodeId !== floatingNodeId() &&
        details.parentNodeId === store.select('floatingParentNodeId')
      ) {
        store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
      }
    }
  }

  onMount(() => {
    store.context.floatingTreeRoot.events.on('menuopenchange', onMenuOpenChange);
    // Close unrelated child submenus when hovering a different item in the parent menu.
    store.context.floatingTreeRoot.events.on('itemhover', onItemHover);
    onCleanup(() => {
      store.context.floatingTreeRoot.events.off('menuopenchange', onMenuOpenChange);
      store.context.floatingTreeRoot.events.off('itemhover', onItemHover);
    });
  });

  function onParentClose(details: MenuOpenEventDetails) {
    if (details.open || details.nodeId !== store.select('floatingParentNodeId')) {
      return;
    }

    const reason: MenuRoot.ChangeEventReason = details.reason ?? REASONS.siblingOpen;
    store.setOpen(false, createChangeEventDetails(reason));
  }

  createEffect(() => {
    if (store.select('floatingParentNodeId') == null) {
      return;
    }

    store.context.floatingTreeRoot.events.on('menuopenchange', onParentClose);
    onCleanup(() => {
      store.context.floatingTreeRoot.events.off('menuopenchange', onParentClose);
    });
  });

  function onItemHover(event: { nodeId: string | undefined; target: Element | null }) {
    // If an item within our parent menu is hovered, and this menu's trigger is not that item,
    // close this submenu. This ensures hovering a different item in the parent closes other branches.
    if (!open || event.nodeId !== store.select('floatingParentNodeId')) {
      return;
    }

    const triggerEl = triggerElement();
    if (event.target && triggerEl && triggerEl !== event.target) {
      store.setOpen(false, createChangeEventDetails(REASONS.siblingOpen));
    }
  }

  createEffect(() => {
    const eventDetails: MenuOpenEventDetails = {
      open: open(),
      nodeId: floatingNodeId(),
      parentNodeId: floatingParentNodeId(),
      reason: store.select('lastOpenChangeReason'),
    };

    store.context.floatingTreeRoot.events.emit('menuopenchange', eventDetails);
  });

  const state: MenuPositioner.State = {
    get open() {
      return open();
    },
    get side() {
      return positioner.side();
    },
    get align() {
      return positioner.align();
    },
    get anchorHidden() {
      return positioner.anchorHidden();
    },
    get nested() {
      return parent().type === 'menu';
    },
  };

  const contextValue: MenuPositionerContext = {
    side: positioner.side,
    align: positioner.align,
    arrowRef: positioner.arrowRef,
    arrowUncentered: positioner.arrowUncentered,
    arrowStyles: positioner.arrowStyles,
    nodeId: positioner.context.nodeId,
  };

  // TODO: Is this still needed in SolidJS?
  // onCleanup(() => {
  //   setPositionerElement(null);
  // });

  const element = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: popupStateMapping,
    ref: (el) => {
      store.set('positionerElement', el);
      if (
        local.anchor != null &&
        triggerElement() == null &&
        (parent().type === undefined || parent().type === 'context-menu')
      ) {
        positioner.context.refs.setFloating(el);
      }
    },
    get props() {
      return [positionerProps, getDisabledMountTransitionStyles(transitionStatus()), elementProps];
    },
  });

  const shouldRenderBackdrop = () => {
    const p = parent();
    return (
      mounted() &&
      p.type !== 'menu' &&
      ((p.type !== 'menubar' && modal() && lastOpenChangeReason() !== REASONS.triggerHover) ||
        (p.type === 'menubar' && p.context.modal()))
    );
  };

  // cuts a hole in the backdrop to allow pointer interaction with the menubar or dropdown menu trigger element
  const backdropCutout = createMemo<HTMLElement | null | undefined>(() => {
    const p = parent();
    if (p.type === 'menubar') {
      return p.context.contentElement();
    }
    if (p.type === undefined) {
      return triggerElement() as HTMLElement | null | undefined;
    }
    return null;
  });

  return (
    <MenuPositionerContext.Provider value={contextValue}>
      <Show when={shouldRenderBackdrop()}>
        <InternalBackdrop
          managed
          ref={(el) => {
            const p = store.context.parent;
            if (p.type === 'context-menu' || p.type === 'nested-context-menu') {
              p.context.internalBackdropRef.current = el;
            }
          }}
          inert={!open()}
          cutout={backdropCutout()}
        />
      </Show>
      <FloatingNode id={floatingNodeId()}>
        <CompositeList
          refs={{
            elements: store.context.itemDomElements.current,
            labels: store.context.itemLabels.current,
          }}
        >
          {element()}
        </CompositeList>
      </FloatingNode>
    </MenuPositionerContext.Provider>
  );
}

export interface MenuPositionerState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  nested: boolean;
}

export interface MenuPositionerProps
  extends
    useAnchorPositioning.SharedParameters,
    BaseUIComponentProps<'div', MenuPositioner.State> {}

export namespace MenuPositioner {
  export type State = MenuPositionerState;
  export type Props = MenuPositionerProps;
}
