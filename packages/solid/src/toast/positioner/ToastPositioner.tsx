import { isElement } from '@floating-ui/utils/dom';
import { createMemo, createSignal, splitProps } from 'solid-js';
import { useFloatingRootContext } from '../../floating-ui-solid';
import { EMPTY_OBJECT, POPUP_COLLISION_AVOIDANCE } from '../../utils/constants';
import { NOOP } from '../../utils/noop';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useAnchorPositioning, type Align, type Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useToastContext } from '../provider/ToastProviderContext';
import { ToastRootCssVars } from '../root/ToastRootCssVars';
import type { ToastObject } from '../useToastManager';
import { ToastPositionerContext } from './ToastPositionerContext';

/**
 * Positions the toast against the anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastPositioner(componentProps: ToastPositioner.Props) {
  const [posLocal, props] = splitProps(componentProps, ['toast']);

  const { toasts } = useToastContext();
  const positionerProps = () =>
    (posLocal.toast.positionerProps ?? EMPTY_OBJECT) as NonNullable<
      typeof posLocal.toast.positionerProps
    >;

  const [local, elementProps] = splitProps(props, [
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
  const anchorProp = () => local.anchor ?? positionerProps().anchor;
  const positionMethod = () =>
    local.positionMethod ?? positionerProps().positionMethod ?? 'absolute';
  const side = () => local.side ?? positionerProps().side ?? 'top';
  const align = () => local.align ?? positionerProps().align ?? 'center';
  const sideOffset = () => local.sideOffset ?? positionerProps().sideOffset ?? 0;
  const alignOffset = () => local.alignOffset ?? positionerProps().alignOffset ?? 0;
  const collisionBoundary = () =>
    local.collisionBoundary ?? positionerProps().collisionBoundary ?? 'clipping-ancestors';
  const collisionPadding = () => local.collisionPadding ?? positionerProps().collisionPadding ?? 5;
  const arrowPadding = () => local.arrowPadding ?? positionerProps().arrowPadding ?? 5;
  const sticky = () => local.sticky ?? positionerProps().sticky ?? false;
  const disableAnchorTracking = () =>
    local.disableAnchorTracking ?? positionerProps().disableAnchorTracking ?? false;
  const collisionAvoidance = () =>
    local.collisionAvoidance ?? positionerProps().collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;

  const [positionerElement, setPositionerElement] = createSignal<HTMLDivElement | null>(null);

  const domIndex = createMemo(() => toasts.list.indexOf(posLocal.toast));
  const visibleIndex = createMemo(() =>
    toasts.list.filter((t) => t.transitionStatus !== 'ending').indexOf(posLocal.toast),
  );

  const anchor = () => {
    const el = anchorProp();
    return isElement(el) ? el : null;
  };

  const floatingRootContext = useFloatingRootContext({
    open: true,
    onOpenChange: NOOP,
    elements: {
      floating: positionerElement,
      reference: anchor,
    },
  });

  const positioning = useAnchorPositioning({
    anchor,
    positionMethod,
    floatingRootContext,
    mounted: true,
    side,
    sideOffset,
    align,
    alignOffset,
    collisionBoundary,
    collisionPadding,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    keepMounted: true,
    collisionAvoidance,
  });

  const defaultProps: HTMLProps = {
    role: 'presentation',
    get style() {
      return {
        ...positioning.positionerStyles(),
        [ToastRootCssVars.index as string]:
          posLocal.toast.transitionStatus === 'ending' ? domIndex() : visibleIndex(),
      };
    },
  };

  const state: ToastPositioner.State = {
    get side() {
      return positioning.side();
    },
    get align() {
      return positioning.align();
    },
    get anchorHidden() {
      return positioning.anchorHidden();
    },
  };

  const contextValue: ToastPositionerContext = {
    side: () => state.side,
    align: () => state.align,
    anchorHidden: () => state.anchorHidden,
    get refs() {
      return {
        arrowRef: positioning.refs.arrowRef(),
      };
    },
    get arrowStyles() {
      return positioning.arrowStyles();
    },
    arrowUncentered: positioning.arrowUncentered,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [defaultProps, elementProps],
    ref: setPositionerElement,
    stateAttributesMapping: popupStateMapping,
  });

  return (
    <ToastPositionerContext.Provider value={contextValue}>
      {element()}
    </ToastPositionerContext.Provider>
  );
}

export interface ToastPositionerState {
  side: Side;
  align: Align;
  anchorHidden: boolean;
}

export interface ToastPositionerProps
  extends
    BaseUIComponentProps<'div', ToastPositioner.State>,
    Omit<useAnchorPositioning.SharedParameters, 'side' | 'anchor'> {
  /**
   * An element to position the toast against.
   */
  anchor?: Element | null | undefined;
  /**
   * Which side of the anchor element to align the toast against.
   * May automatically change to avoid collisions.
   * @default 'top'
   */
  side?: Side;
  /**
   * The toast object associated with the positioner.
   */
  toast: ToastObject<any>;
}

export namespace ToastPositioner {
  export type State = ToastPositionerState;
  export type Props = ToastPositionerProps;
}
