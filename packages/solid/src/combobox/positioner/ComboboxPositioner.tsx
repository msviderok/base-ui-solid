import type { JSX } from 'solid-js';
import { createEffect } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../utils/constants';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { type Align, type Side, useAnchorPositioning } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useScrollLock } from '../../utils/useScrollLock';
import { useComboboxPortalContext } from '../portal/ComboboxPortalContext';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { ComboboxPositionerContext } from './ComboboxPositionerContext';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 */
export function ComboboxPositioner(componentProps: ComboboxPositioner.Props) {
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
  const collisionAvoidance = () => local.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;

  const store = useComboboxRootContext();
  const { filteredItems } = useComboboxDerivedItemsContext();
  const floatingRootContext = useComboboxFloatingContext();
  const keepMounted = useComboboxPortalContext();

  const modal = store.useState('modal');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const openMethod = store.useState('openMethod');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const transitionStatus = store.useState('transitionStatus');

  const empty = () => filteredItems().length === 0;
  const resolvedAnchor = () =>
    local.anchor ?? (inputInsidePopup() ? triggerElement() : inputElement());

  const positioning = useAnchorPositioning({
    anchor: resolvedAnchor,
    floatingRootContext,
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
    collisionAvoidance,
    lazyFlip: true,
  });

  useScrollLock({
    enabled: () => open() && modal() && openMethod() !== 'touch',
    referenceElement: triggerElement,
  });

  const defaultProps: HTMLProps = {
    role: 'presentation',
    get hidden() {
      return !mounted();
    },
    get style(): JSX.CSSProperties {
      const positionerStyles = positioning.positionerStyles();
      return {
        ...positionerStyles,
        'pointer-events': !open() ? 'none' : positionerStyles['pointer-events'],
      };
    },
  };

  const state: ComboboxPositioner.State = {
    get open() {
      return open();
    },
    get side() {
      return positioning.side();
    },
    get align() {
      return positioning.align();
    },
    get anchorHidden() {
      return positioning.anchorHidden();
    },
    get empty() {
      return empty();
    },
  };

  createEffect(() => {
    store.set('popupSide', positioning.side());
  });

  const contextValue: ComboboxPositionerContext = {
    side: positioning.side,
    align: positioning.align,
    refs: positioning.refs,
    arrowUncentered: positioning.arrowUncentered,
    get arrowStyles() {
      return positioning.arrowStyles();
    },
    anchorHidden: positioning.anchorHidden,
    isPositioned: positioning.isPositioned,
  };

  const setPositionerElement = (element: HTMLElement | null | undefined) => {
    store.setState('positionerElement', element);
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: setPositionerElement,
    get props() {
      return [defaultProps, getDisabledMountTransitionStyles(transitionStatus()), elementProps];
    },
    stateAttributesMapping: popupStateMapping,
  });

  return (
    <ComboboxPositionerContext.Provider value={contextValue}>
      {mounted() && modal() && (
        <InternalBackdrop managed inert={!open()} cutout={inputElement() ?? triggerElement()} />
      )}
      {element()}
    </ComboboxPositionerContext.Provider>
  );
}

export interface ComboboxPositionerState {
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  empty: boolean;
}

export interface ComboboxPositionerProps
  extends
    useAnchorPositioning.SharedParameters,
    BaseUIComponentProps<'div', ComboboxPositioner.State> {}

export namespace ComboboxPositioner {
  export type State = ComboboxPositionerState;
  export type Props = ComboboxPositionerProps;
}
