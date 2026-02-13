import { createEffect, createSignal, mergeProps as solidMergeProps, type JSX } from 'solid-js';
import { produce } from 'solid-js/store';
import { CompositeList, type CompositeMetadata } from '../../composite/list/CompositeList';
import type { Padding, VirtualElement } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../utils/constants';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { findItemIndex, itemIncludes } from '../../utils/itemEquality';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps } from '../../utils/types';
import {
  useAnchorPositioning,
  type Align,
  type Boundary,
  type CollisionAvoidance,
  type OffsetFunction,
  type Side,
} from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { useScrollLock } from '../../utils/useScrollLock';
import { clearStyles } from '../popup/utils';
import { useSelectFloatingContext, useSelectRootContext } from '../root/SelectRootContext';
import { SelectPositionerContext } from './SelectPositionerContext';

const FIXED: JSX.CSSProperties = { position: 'fixed' };

/**
 * Positions the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPositioner(componentProps: SelectPositioner.Props) {
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
    'alignItemWithTrigger',
    'collisionAvoidance',
  ]);
  const positionMethod = () => local.positionMethod ?? 'absolute';
  const side = () => local.side ?? 'bottom';
  const align = () => local.align ?? 'center';
  const sideOffset = () => local.sideOffset ?? 0;
  const alignOffset = () => local.alignOffset ?? 0;
  const collisionBoundary = () => local.collisionBoundary ?? 'clipping-ancestors';
  const collisionPadding = () => local.collisionPadding;
  const arrowPadding = () => local.arrowPadding ?? 5;
  const sticky = () => local.sticky ?? false;
  const alignItemWithTrigger = () => local.alignItemWithTrigger ?? true;
  const collisionAvoidance = () => local.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;

  const { store, refs, setValue } = useSelectRootContext();
  const floatingRootContext = useSelectFloatingContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const value = store.useState('value');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  let scrollUpArrowRef = null as HTMLDivElement | null | undefined;
  let scrollDownArrowRef = null as HTMLDivElement | null | undefined;

  const [controlledAlignItemWithTrigger, setControlledAlignItemWithTrigger] =
    createSignal(alignItemWithTrigger());
  const alignItemWithTriggerActive = () =>
    mounted() && controlledAlignItemWithTrigger() && openMethod() !== 'touch';

  createEffect(() => {
    if (!mounted() && controlledAlignItemWithTrigger() !== alignItemWithTrigger()) {
      setControlledAlignItemWithTrigger(alignItemWithTrigger());
    }
  });

  createEffect(() => {
    if (!mounted()) {
      if (store.select('scrollUpArrowVisible')) {
        store.setState('scrollUpArrowVisible', false);
      }
      if (store.select('scrollDownArrowVisible')) {
        store.setState('scrollDownArrowVisible', false);
      }
    }
  });

  createEffect(() => {
    refs.alignItemWithTriggerActiveRef = alignItemWithTriggerActive();
  });

  useScrollLock({
    enabled: () => (alignItemWithTriggerActive() || modal()) && open() && openMethod() !== 'touch',
    referenceElement: triggerElement,
  });

  const positioning = useAnchorPositioning({
    anchor: () => local.anchor,
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
    disableAnchorTracking: () => local.disableAnchorTracking ?? alignItemWithTriggerActive(),
    collisionAvoidance,
    keepMounted: true,
  });

  const renderedSide = () => (alignItemWithTriggerActive() ? 'none' : positioning.side());
  const positionerStyles = () =>
    alignItemWithTriggerActive() ? FIXED : positioning.positionerStyles();

  const defaultProps: JSX.HTMLAttributes<HTMLDivElement> = {
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
        ...positionerStyles(),
        ...hiddenStyles,
      };
    },
  };

  const state: SelectPositioner.State = {
    get open() {
      return open();
    },
    get side() {
      return renderedSide();
    },
    get align() {
      return positioning.align();
    },
    get anchorHidden() {
      return positioning.anchorHidden();
    },
  };

  const setPositionerElement = (element: HTMLElement | null | undefined) => {
    store.set('positionerElement', element);
  };

  let prevMapSizeRef = 0;

  const onMapChange = <Metadata,>(
    newMap: Array<{ element: Element; metadata: CompositeMetadata<Metadata> | null }>,
  ) => {
    if (newMap.length === 0 && prevMapSizeRef === 0) {
      return;
    }

    if (refs.valuesRef.length === 0) {
      return;
    }

    const prevSize = prevMapSizeRef;
    prevMapSizeRef = newMap.length;

    if (newMap.length === prevSize) {
      return;
    }

    const eventDetails = createChangeEventDetails(REASONS.none);
    const val = value();

    if (prevSize !== 0 && !store.state.multiple && val !== null) {
      const valueIndex = findItemIndex(refs.valuesRef, val, isItemEqualToValue());
      if (valueIndex === -1) {
        const initial = refs.initialValueRef;
        const hasInitial =
          initial != null && itemIncludes(refs.valuesRef, initial, isItemEqualToValue());
        const nextValue = hasInitial ? initial : null;
        setValue(nextValue, eventDetails);

        if (nextValue === null) {
          store.set('selectedIndex', null);
          refs.selectedItemTextRef = null;
        }
      }
    }

    if (prevSize !== 0 && store.state.multiple && Array.isArray(val)) {
      const nextValue = val.filter((v) => itemIncludes(refs.valuesRef, v, isItemEqualToValue()));
      if (
        nextValue.length !== val.length ||
        nextValue.some((v) => !itemIncludes(val, v, isItemEqualToValue()))
      ) {
        setValue(nextValue, eventDetails);

        if (nextValue.length === 0) {
          store.set('selectedIndex', null);
          refs.selectedItemTextRef = null;
        }
      }
    }

    if (open() && alignItemWithTriggerActive()) {
      store.update({
        scrollUpArrowVisible: false,
        scrollDownArrowVisible: false,
      });

      const stylesToClear: JSX.CSSProperties = { height: '' };
      clearStyles(positionerElement(), stylesToClear);
      clearStyles(refs.popupRef, stylesToClear);
    }
  };

  const contextValue: SelectPositionerContext = solidMergeProps(positioning, {
    side: renderedSide,
    alignItemWithTriggerActive,
    setControlledAlignItemWithTrigger,
    refs: {
      scrollUpArrowRef,
      scrollDownArrowRef,
    },
  }) as SelectPositionerContext;

  const element = useRenderElement('div', componentProps, {
    state,
    ref: setPositionerElement,
    stateAttributesMapping: popupStateMapping,
    props: [defaultProps, elementProps],
  });

  return (
    <CompositeList
      refs={{ elements: refs.listRef, labels: refs.labelsRef }}
      onMapChange={onMapChange}
    >
      <SelectPositionerContext.Provider value={contextValue}>
        {mounted() && modal() && (
          <InternalBackdrop managed inert={!open()} cutout={triggerElement()} />
        )}
        {element()}
      </SelectPositionerContext.Provider>
    </CompositeList>
  );
}

export interface SelectPositionerState {
  open: boolean;
  side: Side | 'none';
  align: Align;
  anchorHidden: boolean;
}

export interface SelectPositionerProps
  extends
    useAnchorPositioning.SharedParameters,
    BaseUIComponentProps<'div', SelectPositioner.State> {
  /**
   * Whether the positioner overlaps the trigger so the selected item's text is aligned with the trigger's value text. This only applies to mouse input and is automatically disabled if there is not enough space.
   * @default true
   */
  alignItemWithTrigger?: boolean;
}

export namespace SelectPositioner {
  export type State = SelectPositionerState;
  export type Props = SelectPositionerProps;
}
