import { createEffect, onCleanup, Show, mergeProps as solidMergeProps, type JSX } from 'solid-js';
import { FloatingNode, useFloatingNodeId } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { adaptiveOrigin } from '../../utils/adaptiveOriginMiddleware';
import { POPUP_COLLISION_AVOIDANCE } from '../../utils/constants';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useAnchorPositioning, type Align, type Side } from '../../utils/useAnchorPositioning';
import { useAnimationsFinished } from '../../utils/useAnimationsFinished';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverPortalContext } from '../portal/PopoverPortalContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPositionerContext } from './PopoverPositionerContext';

/**
 * Positions the popover against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPositioner(componentProps: PopoverPositioner.Props) {
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
  const positionMethod = () => local.positionMethod ?? 'absolute';
  const side = () => local.side ?? 'bottom';
  const align = () => local.align ?? 'center';
  const sideOffset = () => local.sideOffset ?? 0;
  const alignOffset = () => local.alignOffset ?? 0;
  const collisionBoundary = () => local.collisionBoundary ?? 'clipping-ancestors';
  const collisionPadding = () => local.collisionPadding ?? 5;
  const arrowPadding = () => local.arrowPadding ?? 5;
  const sticky = () => local.sticky ?? false;
  const disableAnchorTracking = () => local.disableAnchorTracking ?? false;
  const collisionAvoidance = () => local.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;

  const { store } = usePopoverRootContext();
  const keepMounted = usePopoverPortalContext();
  const nodeId = useFloatingNodeId();

  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openReason = store.useState('openChangeReason');
  const triggerElement = store.useState('activeTriggerElement');
  const modal = store.useState('modal');
  const positionerElement = store.useState('positionerElement');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const hasViewport = store.useState('hasViewport');

  let prevTriggerElementRef = null as Element | null | undefined;

  const runOnceAnimationsFinish = useAnimationsFinished(positionerElement, false, false);

  const positioning = useAnchorPositioning({
    anchor: () => local.anchor,
    get floatingRootContext() {
      return store.context.floatingRootContext;
    },
    positionMethod,
    mounted,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    collisionBoundary,
    collisionPadding,
    sticky,
    disableAnchorTracking,
    keepMounted,
    nodeId,
    collisionAvoidance,
    adaptiveOrigin: () => (hasViewport() ? adaptiveOrigin : undefined),
  });

  const defaultProps: HTMLProps = {
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
        ...positioning.positionerStyles(),
        ...hiddenStyles,
      };
    },
  };

  const positioner: PopoverPositionerContext = solidMergeProps(positioning, {
    props: defaultProps,
  });

  // When the current trigger element changes, enable transitions on the
  // positioner temporarily
  createEffect(() => {
    const currentTriggerElement = store.context.floatingRootContext.select('domReferenceElement');
    const prevTriggerElement = prevTriggerElementRef;

    if (currentTriggerElement) {
      prevTriggerElementRef = currentTriggerElement;
    }

    if (
      prevTriggerElement &&
      currentTriggerElement &&
      currentTriggerElement !== prevTriggerElement
    ) {
      store.set('instantType', undefined);
      const ac = new AbortController();
      runOnceAnimationsFinish(() => {
        store.set('instantType', 'trigger-change' as any);
      }, ac.signal);

      onCleanup(() => {
        ac.abort();
      });
    }
  });

  const state: PopoverPositioner.State = {
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
    get instant() {
      return instantType();
    },
  };

  const setPositionerElement = (element: HTMLElement | null | undefined) => {
    store.set('positionerElement', element);
  };

  const element = useRenderElement('div', componentProps, {
    state,
    get props() {
      return [positioner.props, getDisabledMountTransitionStyles(transitionStatus()), elementProps];
    },
    ref: setPositionerElement,
    stateAttributesMapping: popupStateMapping,
  });

  return (
    <PopoverPositionerContext.Provider value={positioner}>
      <Show when={mounted() && modal() === true && openReason() !== REASONS.triggerHover}>
        <InternalBackdrop
          managed
          ref={(el) => {
            store.context.internalBackdropRef.current = el;
          }}
          inert={!open()}
          cutout={triggerElement()}
        />
      </Show>

      <FloatingNode id={nodeId()}>{element()}</FloatingNode>
    </PopoverPositionerContext.Provider>
  );
}

export interface PopoverPositionerState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  /**
   * Whether CSS transitions should be disabled.
   */
  instant: string | undefined;
}

export interface PopoverPositionerProps
  extends
    useAnchorPositioning.SharedParameters,
    BaseUIComponentProps<'div', PopoverPositioner.State> {}

export namespace PopoverPositioner {
  export type State = PopoverPositionerState;
  export type Props = PopoverPositionerProps;
}
