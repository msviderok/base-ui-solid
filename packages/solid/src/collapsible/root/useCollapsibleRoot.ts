import {
  batch,
  createEffect,
  createSignal,
  on,
  type Accessor,
  type JSX,
  type Setter,
} from 'solid-js';
import { access, useRef, type MaybeAccessor, type ReactLikeRef } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useAnimationsFinished } from '../../utils/useAnimationsFinished';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useControlled } from '../../utils/useControlled';
import { TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import type { CollapsibleRoot } from './CollapsibleRoot';

export type AnimationType = 'css-transition' | 'css-animation' | 'none' | null;

export interface Dimensions {
  height: number | undefined;
  width: number | undefined;
}

export function useCollapsibleRoot(
  parameters: useCollapsibleRoot.Parameters,
): useCollapsibleRoot.ReturnValue {
  const openParam = () => access(parameters.open);
  const defaultOpen = () => access(parameters.defaultOpen);
  const disabled = () => access(parameters.disabled);
  const isControlled = () => openParam() !== undefined;

  const [open, setOpen] = useControlled({
    controlled: openParam,
    default: defaultOpen,
    name: 'Collapsible',
    state: 'open',
  });

  const { transitionStatus, setMounted, mounted } = useTransitionStatus(open, true, true);
  const [visible, setVisible] = createSignal(open());
  const [dimensions, setDimensions] = createSignal<Dimensions>({
    height: undefined,
    width: undefined,
  });

  const defaultPanelId = useBaseUiId();
  const [panelIdState, setPanelIdState] = createSignal<string | undefined>();
  const panelId = () => panelIdState() ?? defaultPanelId();

  const [hiddenUntilFound, setHiddenUntilFound] = createSignal(false);
  const [keepMounted, setKeepMounted] = createSignal(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const animationTypeRef = useRef<AnimationType>(null);
  const transitionDimensionRef = useRef<'width' | 'height' | null>(null);
  const panelRef = useRef<HTMLElement | null | undefined>(null);

  const runOnceAnimationsFinish = useAnimationsFinished(() => panelRef.current, false);

  function handleTrigger(event: MouseEvent | KeyboardEvent) {
    const nextOpen = !open();
    const eventDetails = createChangeEventDetails(REASONS.triggerPress, event);

    batch(() => {
      parameters.onOpenChange(nextOpen, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      if (animationTypeRef.current === 'css-animation' && panelRef.current != null) {
        panelRef.current!.style.removeProperty('animation-name');
      }

      if (!hiddenUntilFound() && !keepMounted()) {
        if (animationTypeRef.current != null && animationTypeRef.current !== 'css-animation') {
          if (!mounted() && nextOpen) {
            setMounted(true);
          }
        }

        if (animationTypeRef.current === 'css-animation') {
          if (!visible() && nextOpen) {
            setVisible(true);
          }
          if (!mounted() && nextOpen) {
            setMounted(true);
          }
        }
      }

      setOpen(nextOpen);

      if (animationTypeRef.current === 'none' && mounted() && !nextOpen) {
        setMounted(false);
      }
    });
  }

  createEffect(
    on([open, keepMounted, openParam, isControlled], () => {
      /**
       * Unmount immediately when closing in controlled mode and keepMounted={false}
       * and no CSS animations or transitions are applied
       */
      if (isControlled() && animationTypeRef.current === 'none' && !keepMounted() && !open()) {
        setMounted(false);
      }
    }),
  );

  return {
    panelRef,
    abortControllerRef,
    animationTypeRef,
    disabled,
    handleTrigger,
    mounted,
    open,
    panelId,
    runOnceAnimationsFinish,
    setDimensions,
    setHiddenUntilFound,
    setKeepMounted,
    setMounted,
    setOpen,
    setPanelIdState,
    setVisible,
    transitionDimensionRef,
    transitionStatus,
    visible,
    height: () => dimensions().height,
    width: () => dimensions().width,
  };
}

export interface UseCollapsibleRootParameters {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: MaybeAccessor<boolean | undefined>;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled: MaybeAccessor<boolean>;
}

export interface UseCollapsibleRootReturnValue {
  abortControllerRef: ReactLikeRef<AbortController | null>;
  animationTypeRef: ReactLikeRef<AnimationType>;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: Accessor<boolean>;
  handleTrigger: (event: MouseEvent | KeyboardEvent) => void;
  /**
   * The height of the panel.
   */
  height: Accessor<number | undefined>;
  /**
   * Whether the collapsible panel is currently mounted.
   */
  mounted: Accessor<boolean>;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: Accessor<boolean>;
  panelId: Accessor<JSX.HTMLAttributes<Element>['id']>;
  panelRef: ReactLikeRef<HTMLElement | null | undefined>;
  runOnceAnimationsFinish: (fnToExecute: () => void, signal?: AbortSignal | null) => void;
  setDimensions: Setter<Dimensions>;
  setHiddenUntilFound: Setter<boolean>;
  setKeepMounted: Setter<boolean>;
  setMounted: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  setPanelIdState: (id: string | undefined) => void;
  setVisible: Setter<boolean>;
  transitionDimensionRef: ReactLikeRef<'height' | 'width' | null>;
  transitionStatus: Accessor<TransitionStatus>;
  /**
   * The visible state of the panel used to determine the `[hidden]` attribute
   * only when CSS keyframe animations are used.
   */
  visible: Accessor<boolean>;
  /**
   * The width of the panel.
   */
  width: Accessor<number | undefined>;
}

export namespace useCollapsibleRoot {
  export type Parameters = UseCollapsibleRootParameters;
  export type ReturnValue = UseCollapsibleRootReturnValue;
}
