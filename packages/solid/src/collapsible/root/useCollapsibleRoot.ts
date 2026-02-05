import {
  batch,
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Accessor,
  type JSX,
  type Setter,
} from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { access, type CodependentRefs, type MaybeAccessor } from '../../solid-helpers';
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

  const [codependentRefs, setCodependentRefs] = createStore<CodependentRefs<['panel']>>({});
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

  const refs: useCollapsibleRoot.ReturnValue['refs'] = {
    panelRef: null,
    abortControllerRef: null,
  };

  const [animationType, setAnimationType] = createSignal<AnimationType>(null);
  const [transitionDimension, setTransitionDimension] = createSignal<'width' | 'height' | null>(
    null,
  );

  const runOnceAnimationsFinish = useAnimationsFinished(refs.panelRef, false);

  function handleTrigger(event: MouseEvent | KeyboardEvent) {
    const nextOpen = !open();
    const eventDetails = createChangeEventDetails(REASONS.triggerPress, event);

    batch(() => {
      parameters.onOpenChange(nextOpen, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      if (animationType() === 'css-animation' && refs.panelRef != null) {
        refs.panelRef!.style.removeProperty('animation-name');
      }

      if (!hiddenUntilFound() && !keepMounted()) {
        if (animationType() != null && animationType() !== 'css-animation') {
          if (!mounted() && nextOpen) {
            setMounted(true);
          }
        }

        if (animationType() === 'css-animation') {
          if (!visible() && nextOpen) {
            setVisible(true);
          }
          if (!mounted() && nextOpen) {
            setMounted(true);
          }
        }
      }

      setOpen(nextOpen);

      if (animationType() === 'none' && mounted() && !nextOpen) {
        setMounted(false);
      }
    });
  }

  createEffect(
    on(
      () => codependentRefs.panel,
      (panel) => {
        if (panel) {
          setPanelIdState(panel.id() ?? panel.explicitId());
        }

        onCleanup(() => {
          setPanelIdState(undefined);
        });
      },
    ),
  );

  createEffect(
    on([open, keepMounted, openParam, isControlled, animationType], () => {
      /**
       * Unmount immediately when closing in controlled mode and keepMounted={false}
       * and no CSS animations or transitions are applied
       */
      if (isControlled() && animationType() === 'none' && !keepMounted() && !open()) {
        setMounted(false);
      }
    }),
  );

  return {
    refs,
    animationType,
    setAnimationType,
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
    setVisible,
    transitionDimension,
    setTransitionDimension,
    transitionStatus,
    visible,
    codependentRefs,
    setCodependentRefs,
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
  animationType: Accessor<AnimationType>;
  setAnimationType: Setter<AnimationType>;
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
  codependentRefs: Store<CodependentRefs<['panel']>>;
  setCodependentRefs: SetStoreFunction<CodependentRefs<['panel']>>;
  panelId: Accessor<JSX.HTMLAttributes<Element>['id']>;
  refs: {
    abortControllerRef: AbortController | null;
    panelRef: HTMLElement | null | undefined;
  };
  runOnceAnimationsFinish: (fnToExecute: () => void, signal?: AbortSignal | null) => void;
  setDimensions: Setter<Dimensions>;
  setHiddenUntilFound: Setter<boolean>;
  setKeepMounted: Setter<boolean>;
  setMounted: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  setVisible: Setter<boolean>;
  transitionDimension: Accessor<'height' | 'width' | null>;
  setTransitionDimension: Setter<'height' | 'width' | null>;
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
