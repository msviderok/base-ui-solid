import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  Show,
  type Accessor,
  type JSX,
  type ParentProps,
} from 'solid-js';
import { useDirection } from '../direction-provider';
import { Dimensions } from '../floating-ui-solid/types';
import type { SolidStore } from './store/SolidStoreV2';
import { Side } from './useAnchorPositioning';
import { useAnimationFrame } from './useAnimationFrame';
import { useAnimationsFinished } from './useAnimationsFinished';
import { usePopupAutoResize } from './usePopupAutoResize';
import { usePreviousValue } from './usePreviousValue';

export type PopupViewportCssVars = {
  /**
   * CSS variable name storing the popup width for the previous content snapshot.
   */
  popupWidth: string;
  /**
   * CSS variable name storing the popup height for the previous content snapshot.
   */
  popupHeight: string;
};

export interface PopupViewportState {
  /**
   * Direction from which the popup was activated, used for directional animations.
   */
  activationDirection: string | undefined;
  /**
   * Whether the viewport is currently transitioning between contents.
   */
  transitioning: boolean;
}

type PopupViewportStore = Pick<SolidStore<any, any, any>, 'useState' | 'set' | 'select'>;

export interface UsePopupViewportParameters {
  /**
   * Popup store instance for accessing shared popup state.
   */
  store: PopupViewportStore;
  /**
   * Side of the positioner relative to the trigger.
   */
  side: Side;
  /**
   * CSS variable names used for sizing the previous content snapshot.
   */
  cssVars: PopupViewportCssVars;
  /**
   * Viewport children to render in the current container.
   */
  children?: JSX.Element;
}

export interface UsePopupViewportResult {
  /**
   * The viewport children wrapped in current/previous containers as needed.
   */
  children: JSX.Element;
  /**
   * Viewport state used for data attributes and render prop styling.
   */
  state: PopupViewportState;
}

/**
 * Builds morphing viewport containers for popups that animate between trigger-based content.
 * Handles previous-content snapshots, auto-resize, and state attributes for transitions.
 */
export function usePopupViewport(parameters: UsePopupViewportParameters): UsePopupViewportResult {
  const direction = useDirection();
  const activeTrigger = parameters.store.useState('activeTriggerElement');
  const activeTriggerId = parameters.store.useState('activeTriggerId');
  const open = parameters.store.useState('open');
  const payload = parameters.store.useState('payload');
  const mounted = parameters.store.useState('mounted');
  const popupElement = parameters.store.useState('popupElement');
  const positionerElement = parameters.store.useState('positionerElement');

  const previousActiveTrigger = usePreviousValue(() => (open() ? activeTrigger() : null));
  const currentContentKey = usePopupContentKey({
    activeTriggerId,
    payload,
  });

  let capturedNodeRef = null as HTMLElement | null | undefined;
  const [previousContentNode, setPreviousContentNode] = createSignal<
    HTMLElement | null | undefined
  >(null);

  const [newTriggerOffset, setNewTriggerOffset] = createSignal<Offset | null>(null);

  let currentContainerRef: HTMLDivElement | undefined;
  let previousContainerRef: HTMLDivElement | undefined;

  const onAnimationsFinished = useAnimationsFinished(() => currentContainerRef, true, false);
  const cleanupFrame = useAnimationFrame();

  const [previousContentDimensions, setPreviousContentDimensions] = createSignal<{
    width: number;
    height: number;
  } | null>(null);

  const [showStartingStyleAttribute, setShowStartingStyleAttribute] = createSignal(false);

  createEffect(() => {
    parameters.store.set('hasViewport', true);
    onCleanup(() => parameters.store.set('hasViewport', false));
  });

  const handleMeasureLayout = () => {
    currentContainerRef?.style.setProperty('animation', 'none');
    currentContainerRef?.style.setProperty('transition', 'none');

    previousContainerRef?.style.setProperty('display', 'none');
  };

  const handleMeasureLayoutComplete = (previousDimensions: Dimensions | null) => {
    currentContainerRef?.style.removeProperty('animation');
    currentContainerRef?.style.removeProperty('transition');

    previousContainerRef?.style.removeProperty('display');

    if (previousDimensions) {
      setPreviousContentDimensions(previousDimensions);
    }
  };

  let lastHandledTriggerRef = null as Element | null | undefined;

  createEffect(() => {
    // When a trigger changes, set the captured children HTML to state,
    // so we can render both new and old content.
    if (
      activeTrigger() &&
      previousActiveTrigger() &&
      activeTrigger() !== previousActiveTrigger() &&
      lastHandledTriggerRef !== activeTrigger() &&
      capturedNodeRef
    ) {
      setPreviousContentNode(capturedNodeRef);
      setShowStartingStyleAttribute(true);

      // Calculate the relative position between the previous and new trigger,
      // so we can pass it to the style hook for animation purposes.
      const offset = calculateRelativePosition(previousActiveTrigger()!, activeTrigger()!);
      setNewTriggerOffset(offset);

      cleanupFrame.request(() => {
        cleanupFrame.request(() => {
          setShowStartingStyleAttribute(false);
          onAnimationsFinished(() => {
            setPreviousContentNode(null);
            setPreviousContentDimensions(null);
            capturedNodeRef = null;
          });
        });
      });

      lastHandledTriggerRef = activeTrigger();
    }
  });

  // Capture a clone of the current content DOM subtree when not transitioning.
  // We can't store previous React nodes as they may be stateful; instead we capture DOM clones for visual continuity.
  createEffect(
    on(currentContentKey, () => {
      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        // When a transition is in progress, we store the next content in capturedNodeRef.
        // This handles the case where the trigger changes multiple times before the transition finishes.
        // We want to always capture the latest content for the previous snapshot.
        // So clicking quickly on T1, T2, T3 will result in the following sequence:
        // 1. T1 -> T2: previousContent = T1, currentContent = T2
        // 2. T2 -> T3: previousContent = T2, currentContent = T3
        const source = currentContainerRef;
        if (!source) {
          return;
        }

        const wrapper = document.createElement('div');
        for (const child of Array.from(source.childNodes)) {
          wrapper.appendChild(child.cloneNode(true));
        }

        capturedNodeRef = wrapper;
      });

      onCleanup(() => {
        cancelled = true;
      });
    }),
  );

  const isTransitioning = () => previousContentNode() != null;

  // When previousContentNode is present, imperatively populate the previous container with the cloned children.
  createEffect(
    on(previousContentNode, (contentNode) => {
      if (!contentNode) {
        return;
      }

      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        const container = previousContainerRef;
        if (!container) {
          return;
        }

        container.replaceChildren(...Array.from(contentNode.childNodes));
      });

      onCleanup(() => {
        cancelled = true;
      });
    }),
  );

  usePopupAutoResize({
    popupElement,
    positionerElement,
    mounted,
    content: payload,
    onMeasureLayout: handleMeasureLayout,
    onMeasureLayoutComplete: handleMeasureLayoutComplete,
    side: parameters.side,
    direction,
  });

  const state: PopupViewportState = {
    get activationDirection() {
      return getActivationDirection(newTriggerOffset());
    },
    get transitioning() {
      return isTransitioning();
    },
  };

  function ContainerComponent(props: ParentProps<{ 'data-starting-style'?: '' | undefined }>) {
    return <div data-current ref={currentContainerRef} {...props} />;
  }

  function CurrentContainer(props: ParentProps<{ 'data-starting-style'?: '' | undefined }>) {
    return (
      <Show keyed when={currentContentKey()}>
        {() => <ContainerComponent {...props}>{parameters.children}</ContainerComponent>}
      </Show>
    );
  }

  return {
    state,
    get children() {
      return (
        <>
          <Show when={!isTransitioning()}>
            {<CurrentContainer>{parameters.children}</CurrentContainer>}
          </Show>
          <Show when={isTransitioning()}>
            <div
              data-previous
              inert={true}
              ref={previousContainerRef}
              style={
                {
                  [parameters.cssVars.popupWidth]: `${previousContentDimensions()?.width}px`,
                  [parameters.cssVars.popupHeight]: `${previousContentDimensions()?.height}px`,
                  position: 'absolute',
                } as JSX.CSSProperties
              }
              data-ending-style={showStartingStyleAttribute() ? undefined : ''}
            />
            <CurrentContainer data-starting-style={showStartingStyleAttribute() ? '' : undefined}>
              {parameters.children}
            </CurrentContainer>
          </Show>
        </>
      );
    },
  };
}

type Offset = {
  horizontal: number;
  vertical: number;
};

/**
 * Returns a string describing the provided offset.
 * It describes both the horizontal and vertical offset, separated by a space.
 *
 * @param offset
 */
function getActivationDirection(offset: Offset | null): string | undefined {
  if (!offset) {
    return undefined;
  }

  return `${getValueWithTolerance(offset.horizontal, 5, 'right', 'left')} ${getValueWithTolerance(offset.vertical, 5, 'down', 'up')}`;
}

/**
 * Returns a label describing the value (positive/negative) treating values
 * within tolerance as zero.
 *
 * @param value Value to check
 * @param tolerance Tolerance to treat the value as zero.
 * @param positiveLabel
 * @param negativeLabel
 * @returns If 0 < abs(value) < tolerance, returns an empty string. Otherwise returns positiveLabel or negativeLabel.
 */
function getValueWithTolerance(
  value: number,
  tolerance: number,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (value > tolerance) {
    return positiveLabel;
  }

  if (value < -tolerance) {
    return negativeLabel;
  }

  return '';
}

/**
 * Calculates the relative position between centers of two elements.
 */
function calculateRelativePosition(from: Element, to: Element): Offset {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  const fromCenter = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height / 2,
  };
  const toCenter = {
    x: toRect.left + toRect.width / 2,
    y: toRect.top + toRect.height / 2,
  };

  return {
    horizontal: toCenter.x - fromCenter.x,
    vertical: toCenter.y - fromCenter.y,
  };
}

/**
 * Returns a key that forces remounting content when triggers change or a payload is updated.
 */
function usePopupContentKey(parameters: {
  activeTriggerId: Accessor<string | null>;
  payload: Accessor<unknown>;
}): Accessor<string> {
  const [contentKey, setContentKey] = createSignal(0);
  let previousActiveTriggerIdRef = parameters.activeTriggerId();
  let previousPayloadRef = parameters.payload();
  let pendingPayloadUpdateRef = false;

  createEffect(() => {
    const activeTriggerId = parameters.activeTriggerId();
    const payload = parameters.payload();

    // Compare against the last committed values to decide whether we need a new DOM subtree.
    const previousActiveTriggerId = previousActiveTriggerIdRef;
    const previousPayload = previousPayloadRef;
    const triggerIdChanged = activeTriggerId !== previousActiveTriggerId;
    const payloadChanged = payload !== previousPayload;

    if (triggerIdChanged) {
      // Remount immediately on trigger change; remember if payload hasn't caught up yet.
      setContentKey((value) => value + 1);
      pendingPayloadUpdateRef = !payloadChanged;
    } else if (pendingPayloadUpdateRef && payloadChanged) {
      // Payload arrived a render later, so remount once more to avoid reusing the old <img>.
      setContentKey((value) => value + 1);
      pendingPayloadUpdateRef = false;
    }

    // Persist current values for the next render's comparison.
    previousActiveTriggerIdRef = activeTriggerId;
    previousPayloadRef = payload;
  });

  const key = createMemo(() => `${parameters.activeTriggerId() ?? 'current'}-${contentKey()}`);
  return key;
}
