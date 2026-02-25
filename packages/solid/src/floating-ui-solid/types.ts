import type { VirtualElement } from '@floating-ui/dom';
import type { Accessor, JSX } from 'solid-js';
import type { MaybeAccessor } from '../solid-helpers';
import type { BaseUIChangeEventDetails } from '../utils/createBaseUIEventDetails';
import type { FloatingRootStore } from './components/FloatingRootStoreV2';
import type { FloatingTreeStore } from './components/FloatingTreeStore';
import type {
  UsePositionFloatingReturn,
  UsePositionFloatingSharedReturn,
  UsePositionOptions,
} from './hooks/useFloatingOriginal';
import type { ExtendedUserProps } from './hooks/useInteractions';

export {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  detectOverflow,
  flip,
  getOverflowAncestors,
  hide,
  inline,
  limitShift,
  offset,
  platform,
  shift,
  size,
} from '@floating-ui/dom';
export type {
  AlignedPlacement,
  Alignment,
  ArrowOptions,
  AutoPlacementOptions,
  AutoUpdateOptions,
  Axis,
  Boundary,
  ClientRectObject,
  ComputePositionConfig,
  ComputePositionReturn,
  Coords,
  DetectOverflowOptions,
  Dimensions,
  ElementContext,
  ElementRects,
  Elements,
  FlipOptions,
  FloatingElement,
  HideOptions,
  InlineOptions,
  Length,
  Middleware,
  MiddlewareArguments,
  MiddlewareData,
  MiddlewareReturn,
  MiddlewareState,
  NodeScroll,
  OffsetOptions,
  Padding,
  Placement,
  Platform,
  Rect,
  ReferenceElement,
  RootBoundary,
  ShiftOptions,
  Side,
  SideObject,
  SizeOptions,
  Strategy,
  VirtualElement,
} from '@floating-ui/dom';
export * from '.';
export type { FloatingDelayGroupProps } from './components/FloatingDelayGroup';
export type { FloatingFocusManagerProps } from './components/FloatingFocusManager';
export type { UseFloatingPortalNodeProps } from './components/FloatingPortal';
export type { FloatingNodeProps, FloatingTreeProps } from './components/FloatingTree';
export type { UseClientPointProps } from './hooks/useClientPoint';
export type { UseDismissProps } from './hooks/useDismiss';
export type { UseFloatingRootContextOptions } from './hooks/useFloatingRootContext';
export type { UseFocusProps } from './hooks/useFocus';
export type { HandleClose, HandleCloseContext, UseHoverProps } from './hooks/useHover';
export type { UseHoverFloatingInteractionProps } from './hooks/useHoverFloatingInteraction';
export type { UseHoverReferenceInteractionProps } from './hooks/useHoverReferenceInteraction';
export type { UseInteractionsReturn } from './hooks/useInteractions';
export type { UseListNavigationProps } from './hooks/useListNavigation';
export type { UseRoleProps } from './hooks/useRole';
export type { UseTypeaheadProps } from './hooks/useTypeahead';
export type { SafePolygonOptions } from './safePolygon';

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Delay = number | Partial<{ open: number; close: number }>;

export type NarrowedElement<T> = T extends Element ? T : Element;

export interface ExtendedRefs {
  reference: Accessor<ReferenceType | null | undefined>;
  floating: Accessor<HTMLElement | null | undefined>;
  domReference: Accessor<NarrowedElement<ReferenceType> | null | undefined>;
  setReference: (value: ReferenceType | null | undefined) => void;
  setFloating: (value: HTMLElement | null | undefined) => void;
  setPositionReference: (value: ReferenceType | null | undefined) => void;
}

export interface ExtendedElements {
  reference: Accessor<ReferenceType | null | undefined>;
  floating: Accessor<HTMLElement | null | undefined>;
  domReference: Accessor<NarrowedElement<ReferenceType> | null | undefined>;
}

export interface FloatingEvents {
  emit<T extends string>(event: T, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

export interface ContextData {
  openEvent?: Event | undefined;
  floatingContext?: FloatingContext | undefined;
  /** @deprecated use `onTypingChange` prop in `useTypeahead` */
  typing?: boolean | undefined;
  [key: string]: any;
}

export type FloatingRootContext = FloatingRootStore;

export interface FloatingContext extends UsePositionFloatingSharedReturn {
  open: Accessor<boolean>;
  onOpenChange(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  events: FloatingEvents;
  dataRef: ContextData;
  nodeId: Accessor<string | undefined>;
  floatingId: Accessor<string | undefined>;
  refs: ExtendedRefs;
  elements: ExtendedElements;
  rootStore: FloatingRootContext;
}

export interface FloatingNodeType {
  id: string | null;
  parentId: string | null;
  context?: FloatingContext | undefined;
}

export type FloatingTreeType = FloatingTreeStore;

export interface ElementProps {
  reference?: JSX.HTMLAttributes<Element> | undefined;
  floating?: JSX.HTMLAttributes<HTMLElement> | undefined;
  item?:
    | (
        | JSX.HTMLAttributes<HTMLElement>
        | ((props: ExtendedUserProps) => JSX.HTMLAttributes<HTMLElement>)
      )
    | undefined;
  trigger?: JSX.HTMLAttributes<Element> | undefined;
}

export type ReferenceType = Element | VirtualElement;

export type UseFloatingReturn = Prettify<
  Accessorify<Omit<UsePositionFloatingReturn, 'refs' | 'elements'>> & {
    /**
     * `FloatingContext`
     */
    context: Prettify<FloatingContext>;
    /**
     * Object containing the reference and floating refs and reactive setters.
     */
    refs: ExtendedRefs;
    elements: ExtendedElements;
  }
>;

export interface UseFloatingOptions extends Omit<UsePositionOptions, 'elements'> {
  rootContext?: FloatingRootContext | undefined;
  /**
   * Object of external elements as an alternative to the `refs` object setters.
   */
  elements?:
    | {
        /**
         * Externally passed reference element. Store in state.
         */
        reference?: MaybeAccessor<(ReferenceType | null) | undefined>;
        /**
         * Externally passed floating element. Store in state.
         */
        floating?: MaybeAccessor<(HTMLElement | null) | undefined>;
      }
    | undefined;
  /**
   * An event callback that is invoked when the floating element is opened or
   * closed.
   */
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  /**
   * Unique node id when using `FloatingTree`.
   */
  nodeId?: MaybeAccessor<string | undefined>;
  /**
   * External FlatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}

export type Accessorify<T, Type extends 'accessor' | 'maybeAccessor' = 'accessor'> = {
  [K in keyof T]: T[K] extends Accessor<any>
    ? T[K]
    : T[K] extends Function
      ? T[K]
      : Type extends 'accessor'
        ? Accessor<T[K]>
        : MaybeAccessor<T[K]>;
};
