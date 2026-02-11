import { batch, createSignal, onMount, type JSX } from 'solid-js';
import {
  safePolygon,
  useDismiss,
  useFloatingRootContext,
  useHover,
  useInteractions,
} from '../../floating-ui-solid';
import { mergeProps } from '../../merge-props';
import { type BaseUIChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { useFocusWithDelay } from '../../utils/interactions/useFocusWithDelay';
import { REASONS } from '../../utils/reasons';
import { useControlled } from '../../utils/useControlled';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useTransitionStatus } from '../../utils/useTransitionStatus';
import { CLOSE_DELAY, OPEN_DELAY } from '../utils/constants';
import { PreviewCardRootContext, type PreviewCardTriggerDelayConfig } from './PreviewCardContext';

/**
 * Groups all parts of the preview card.
 * Doesn’t render its own HTML element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardRoot(props: PreviewCardRoot.Props) {
  const externalOpen = () => props.open;
  let delayRef = OPEN_DELAY;
  let closeDelayRef = CLOSE_DELAY;

  const writeDelayRefs = (config: PreviewCardTriggerDelayConfig) => {
    delayRef = config.delay ?? OPEN_DELAY;
    closeDelayRef = config.closeDelay ?? CLOSE_DELAY;
  };

  const [triggerElement, setTriggerElement] = createSignal<Element | null | undefined>(null);
  const [positionerElement, setPositionerElement] = createSignal<HTMLElement | null | undefined>(
    null,
  );
  const [instantTypeState, setInstantTypeState] = createSignal<'dismiss' | 'focus'>();

  const refs: PreviewCardRootContext['refs'] = {
    popupRef: null,
  };

  const [open, setOpenUnwrapped] = useControlled({
    controlled: externalOpen,
    default: () => props.defaultOpen,
    name: 'PreviewCard',
    state: 'open',
  });

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open);

  const handleUnmount = () => {
    batch(() => {
      setMounted(false);
      props.onOpenChangeComplete?.(false);
    });
  };

  useOpenChangeComplete({
    enabled: () => !props.actionsRef,
    open,
    ref: () => refs.popupRef,
    onComplete() {
      if (!open()) {
        handleUnmount();
      }
    },
  });

  onMount(() => {
    if (props.actionsRef) {
      props.actionsRef.unmount = handleUnmount;
    }
  });

  const setOpen = (nextOpen: boolean, eventDetails: PreviewCardRoot.ChangeEventDetails) => {
    const isHover = eventDetails.reason === REASONS.triggerHover;
    const isFocusOpen = nextOpen && eventDetails.reason === REASONS.triggerFocus;
    const isDismissClose =
      !nextOpen &&
      (eventDetails.reason === REASONS.triggerPress || eventDetails.reason === REASONS.escapeKey);

    props.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    function changeState() {
      setOpenUnwrapped(nextOpen);
    }

    if (isHover) {
      // If a hover reason is provided, we need to flush the state synchronously. This ensures
      // `node.getAnimations()` knows about the new state.
      changeState();
    } else {
      changeState();
    }

    if (isFocusOpen || isDismissClose) {
      setInstantTypeState(isFocusOpen ? 'focus' : 'dismiss');
    } else if (eventDetails.reason === REASONS.triggerHover) {
      setInstantTypeState(undefined);
    }
  };

  const context = useFloatingRootContext({
    elements: {
      reference: triggerElement,
      floating: positionerElement,
    },
    open,
    onOpenChange: (nextOpen, eventDetails) =>
      setOpen(nextOpen, eventDetails as PreviewCardRoot.ChangeEventDetails),
  });

  const instantType = () => instantTypeState();

  const getDelayValue = () => delayRef;
  const getCloseDelayValue = () => closeDelayRef;

  const hover = useHover(context, {
    mouseOnly: true,
    move: false,
    handleClose: safePolygon(),
    restMs: getDelayValue,
    delay: () => ({
      close: getCloseDelayValue(),
    }),
  });
  const focus = useFocusWithDelay(context, { delay: getDelayValue });
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  const contextValue: PreviewCardRootContext = {
    open,
    setOpen,
    mounted,
    setMounted,
    setTriggerElement,
    positionerElement,
    setPositionerElement,
    refs,
    triggerProps: (externalProps) => mergeProps(externalProps, getReferenceProps()),
    popupProps: (externalProps) => mergeProps(externalProps, getFloatingProps()),
    floatingRootContext: context,
    instantType,
    transitionStatus,
    onOpenChangeComplete: props.onOpenChangeComplete,
    writeDelayRefs,
  };

  return (
    <PreviewCardRootContext.Provider value={contextValue}>
      {props.children}
    </PreviewCardRootContext.Provider>
  );
}

export interface PreviewCardRootState {}

export interface PreviewCardRootProps {
  children?: JSX.Element;
  /**
   * Whether the preview card is initially open.
   *
   * To render a controlled preview card, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Whether the preview card is currently open.
   */
  open?: boolean;
  /**
   * Event handler called when the preview card is opened or closed.
   */
  onOpenChange?: (open: boolean, eventDetails: PreviewCardRoot.ChangeEventDetails) => void;
  /**
   * Event handler called after any animations complete when the preview card is opened or closed.
   */
  onOpenChangeComplete?: (open: boolean) => void;
  /**
   * A ref to imperative actions.
   * - `unmount`: When specified, the preview card will not be unmounted when closed.
   * Instead, the `unmount` function must be called to unmount the preview card manually.
   * Useful when the preview card's animation is controlled by an external library.
   */
  actionsRef?: PreviewCardRoot.Actions;
}

export interface PreviewCardRootActions {
  unmount: () => void;
}

export type PreviewCardRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.none;

export type PreviewCardRootChangeEventDetails =
  BaseUIChangeEventDetails<PreviewCardRoot.ChangeEventReason>;

export namespace PreviewCardRoot {
  export type State = PreviewCardRootState;
  export type Props = PreviewCardRootProps;
  export type Actions = PreviewCardRootActions;
  export type ChangeEventReason = PreviewCardRootChangeEventReason;
  export type ChangeEventDetails = PreviewCardRootChangeEventDetails;
}
