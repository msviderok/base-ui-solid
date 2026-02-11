import { createEffect, createSignal, onCleanup, Show, type JSX } from 'solid-js';
import { useDirection } from '../../direction-provider/DirectionContext';
import { Dimensions } from '../../floating-ui-solid/types';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import { useAnimationsFinished } from '../../utils/useAnimationsFinished';
import { usePopupAutoResize } from '../../utils/usePopupAutoResize';
import { usePreviousValue } from '../../utils/usePreviousValue';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverViewportCssVars } from './PopoverViewportCssVars';

const stateAttributesMapping: StateAttributesMapping<PopoverViewport.State> = {
  activationDirection: (value) =>
    value
      ? {
          'data-activation-direction': value,
        }
      : null,
};

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content change based on the trigger
 * and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverViewport(componentProps: PopoverViewport.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);

  const { store } = usePopoverRootContext();
  const positioner = usePopoverPositionerContext();
  const direction = useDirection();

  const activeTrigger = store.useState('activeTriggerElement');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload');
  const popupElement = store.useState('popupElement');
  const positionerElement = store.useState('positionerElement');

  const previousActiveTrigger = usePreviousValue(() => (open() ? activeTrigger() : null));

  let capturedNodeRef = null as HTMLElement | null | undefined;
  const [previousContentNode, setPreviousContentNode] = createSignal<HTMLElement | null>(null);

  const [newTriggerOffset, setNewTriggerOffset] = createSignal<Offset | null>(null);

  let currentContainerRef = null as HTMLDivElement | null | undefined;
  let previousContainerRef = null as HTMLDivElement | null | undefined;

  const onAnimationsFinished = useAnimationsFinished(currentContainerRef, true, false);
  const cleanupFrame = useAnimationFrame();

  const [previousContentDimensions, setPreviousContentDimensions] = createSignal<{
    width: number;
    height: number;
  } | null>(null);

  const [showStartingStyleAttribute, setShowStartingStyleAttribute] = createSignal(false);

  createEffect(() => {
    store.set('hasViewport', true);
    onCleanup(() => {
      store.set('hasViewport', false);
    });
  });

  // Capture a clone of the current content DOM subtree when not transitioning.
  // We can't store previous React nodes as they may be stateful; instead we capture DOM clones for visual continuity.
  createEffect(() => {
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

  const isTransitioning = () => previousContentNode() != null;

  // When previousContentNode is present, imperatively populate the previous container with the cloned children.
  createEffect(() => {
    const container = previousContainerRef;
    if (!container || !previousContentNode()) {
      return;
    }

    container.replaceChildren(...Array.from(previousContentNode()!.childNodes));
  });

  usePopupAutoResize({
    popupElement,
    positionerElement,
    mounted,
    content: payload,
    onMeasureLayout: handleMeasureLayout,
    onMeasureLayoutComplete: handleMeasureLayoutComplete,
    side: positioner.side,
    direction,
  });

  const state = {
    get activationDirection() {
      return getActivationDirection(newTriggerOffset());
    },
    get transitioning() {
      return isTransitioning;
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping,
    get children() {
      return (
        <Show
          when={isTransitioning()}
          fallback={
            <div
              data-current
              ref={(el) => {
                currentContainerRef = el;
              }}
            >
              {local.children}
            </div>
          }
        >
          <div
            data-previous
            inert
            ref={(el) => {
              previousContainerRef = el;
            }}
            style={{
              [PopoverViewportCssVars.popupWidth]: `${previousContentDimensions()?.width}px`,
              [PopoverViewportCssVars.popupHeight]: `${previousContentDimensions()?.height}px`,
              position: 'absolute',
            }}
            data-ending-style={showStartingStyleAttribute() ? undefined : ''}
          />
          <div
            data-current
            ref={(el) => {
              currentContainerRef = el;
            }}
            data-starting-style={showStartingStyleAttribute() ? '' : undefined}
          >
            {local.children}
          </div>
        </Show>
      );
    },
  });

  return <>{element()}</>;
}

export namespace PopoverViewport {
  export interface Props extends BaseUIComponentProps<'div', State> {
    /**
     * The content to render inside the transition container.
     */
    children?: JSX.Element;
  }

  export interface State {
    activationDirection?: string;
  }
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
 * Returns a label describing the value (positive/negative) trating values
 * within tolarance as zero.
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
