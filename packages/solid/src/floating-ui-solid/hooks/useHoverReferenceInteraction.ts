import { ownerDocument } from '@base-ui/utils/owner';
import { isElement } from '@floating-ui/utils/dom';
import { createEffect, onCleanup, mergeProps as solidMergeProps } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { FloatingUIOpenChangeDetails, HTMLProps } from '../../utils/types';
import { useFloatingTree } from '../components/FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { FloatingContext, FloatingRootContext } from '../types';
import { contains, isMouseLikePointerType, isTargetInsideEnabledTrigger } from '../utils';
import { type UseHoverProps, getDelay } from './useHover';
import {
  safePolygonIdentifier,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';

export interface UseHoverReferenceInteractionProps extends UseHoverProps {
  enabled?: boolean | undefined;
  mouseOnly?: boolean | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Whether the hook controls the active trigger. When false, the props are
   * returned under the `trigger` key so they can be applied to inactive
   * triggers via `getTriggerProps`.
   * @default true
   */
  isActiveTrigger?: boolean | undefined;
  triggerElementRef?: Readonly<Element | null | undefined>;
}

function getRestMs(value: number | (() => number)) {
  if (typeof value === 'function') {
    return value();
  }
  return value;
}

const EMPTY_REF: Readonly<Element | null | undefined> = null;

/**
 * Provides hover interactions that should be attached to reference or trigger
 * elements.
 */
export function useHoverReferenceInteraction(parameters: {
  context: FloatingRootContext | FloatingContext;
  props: UseHoverReferenceInteractionProps;
}): HTMLProps | undefined {
  const store =
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;
  const props = defaultProps(parameters.props, {
    enabled: true,
    delay: 0,
    handleClose: null,
    mouseOnly: false,
    restMs: 0,
    move: true,
    triggerElementRef: EMPTY_REF,
    isActiveTrigger: true,
  });

  const tree = useFloatingTree(parameters.props.externalTree);

  const [instance, setInstanceState] = useHoverInteractionSharedState({ store });

  createEffect(() => {
    if (props.isActiveTrigger) {
      setInstanceState('handleCloseOptions', props.handleClose?.__options);
    }
  });

  const isClickLikeOpenEvent = () => {
    if (instance.interactedInside) {
      return true;
    }

    return store.context.dataRef.openEvent
      ? ['click', 'mousedown'].includes(store.context.dataRef.openEvent.type)
      : false;
  };

  const isRelatedTargetInsideEnabledTrigger = (target: EventTarget | null | undefined) => {
    return isTargetInsideEnabledTrigger(target, store.context.triggerElements);
  };

  const closeWithDelay = (event: MouseEvent, runElseBranch = true) => {
    const closeDelay = getDelay(props.delay, 'close', instance.pointerType);
    if (closeDelay && !instance.handler) {
      instance.openChangeTimeout.start(closeDelay, () =>
        store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
      );
    } else if (runElseBranch) {
      instance.openChangeTimeout.clear();
      store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
    }
  };

  const cleanupMouseMoveHandler = () => {
    instance.unbindMouseMove();
    setInstanceState('handler', undefined);
  };

  const clearPointerEvents = () => {
    if (instance.performedPointerEventsMutation) {
      const body = ownerDocument(store.select('domReferenceElement') ?? null).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      setInstanceState('performedPointerEventsMutation', false);
    }
  };

  function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
    if (!details.open) {
      instance.openChangeTimeout.clear();
      instance.restTimeout.clear();
      setInstanceState('blockMouseMove', true);
      setInstanceState('restTimeoutPending', false);
    }
  }

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  createEffect(() => {
    if (!props.enabled) {
      return;
    }

    store.context.events.on('openchange', onOpenChangeLocal);
    onCleanup(() => store.context.events.off('openchange', onOpenChangeLocal));
  });

  const handleScrollMouseLeave = (event: MouseEvent) => {
    if (isClickLikeOpenEvent()) {
      return;
    }

    if (!store.context.dataRef.floatingContext) {
      return;
    }

    if (isRelatedTargetInsideEnabledTrigger(event.relatedTarget)) {
      return;
    }

    const currentTrigger = props.triggerElementRef;
    const localMergedProps = solidMergeProps(store.context.dataRef.floatingContext, {
      tree,
      x: () => event.clientX,
      y: () => event.clientY,
      onClose() {
        clearPointerEvents();
        cleanupMouseMoveHandler();
        if (!isClickLikeOpenEvent() && currentTrigger === store.select('domReferenceElement')) {
          closeWithDelay(event);
        }
      },
    });

    props.handleClose?.(localMergedProps)?.(event);
  };

  createEffect(() => {
    if (!props.enabled) {
      return;
    }

    const trigger =
      (props.triggerElementRef as HTMLElement | null) ??
      (props.isActiveTrigger ? (store.select('domReferenceElement') as HTMLElement | null) : null);

    if (!isElement(trigger)) {
      return;
    }

    function onMouseEnter(event: MouseEvent) {
      instance.openChangeTimeout.clear();
      setInstanceState('blockMouseMove', false);

      if (props.mouseOnly && !isMouseLikePointerType(instance.pointerType)) {
        return;
      }

      // Only rest delay is set; there's no fallback delay.
      // This will be handled by `onMouseMove`.
      if (getRestMs(props.restMs) > 0 && !getDelay(props.delay, 'open')) {
        return;
      }

      const openDelay = getDelay(props.delay, 'open', instance.pointerType);
      const currentDomReference = store.select('domReferenceElement');
      const allTriggers = store.context.triggerElements;

      const isOverInactiveTrigger =
        (allTriggers.hasElement(event.target as Element) ||
          allTriggers.hasMatchingElement((t) => contains(t, event.target as Element))) &&
        (!currentDomReference || !contains(currentDomReference, event.target as Element));

      const triggerNode = (event.currentTarget as HTMLElement) ?? null;

      const isOpen = store.select('open');
      const shouldOpen = !isOpen || isOverInactiveTrigger;

      // When moving between triggers while already open, open immediately without delay
      if (isOverInactiveTrigger && isOpen) {
        store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
      } else if (openDelay) {
        instance.openChangeTimeout.start(openDelay, () => {
          if (shouldOpen) {
            store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
          }
        });
      } else if (shouldOpen) {
        store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
      }
    }

    function onMouseLeave(event: MouseEvent) {
      if (isClickLikeOpenEvent()) {
        clearPointerEvents();
        return;
      }

      instance.unbindMouseMove();

      const domReferenceElement = store.select('domReferenceElement') ?? null;
      const doc = ownerDocument(domReferenceElement);
      instance.restTimeout.clear();
      setInstanceState('restTimeoutPending', false);

      if (isRelatedTargetInsideEnabledTrigger(event.relatedTarget)) {
        return;
      }

      if (props.handleClose && store.context.dataRef.floatingContext) {
        if (!store.select('open')) {
          instance.openChangeTimeout.clear();
        }

        const currentTrigger = props.triggerElementRef;

        const handlerProps = solidMergeProps(store.context.dataRef.floatingContext, {
          tree,
          x: () => event.clientX,
          y: () => event.clientY,
          onClose() {
            clearPointerEvents();
            cleanupMouseMoveHandler();
            if (
              props.enabled &&
              !isClickLikeOpenEvent() &&
              currentTrigger === store.select('domReferenceElement')
            ) {
              closeWithDelay(event, true);
            }
          },
        });

        const handlerValue = props.handleClose!(handlerProps);
        setInstanceState('handler', () => handlerValue);

        const handler = instance.handler!;
        handler(event);

        doc.addEventListener('mousemove', handler);
        instance.unbindMouseMove = () => {
          doc.removeEventListener('mousemove', handler);
        };

        return;
      }

      const shouldClose =
        instance.pointerType === 'touch'
          ? !contains(store.select('floatingElement'), event.relatedTarget as Element | null)
          : true;

      if (shouldClose) {
        closeWithDelay(event);
      }
    }

    function onScrollMouseLeave(event: MouseEvent) {
      handleScrollMouseLeave(event);
    }

    if (store.select('open')) {
      trigger.addEventListener('mouseleave', onScrollMouseLeave);
    }

    if (props.move) {
      trigger.addEventListener('mousemove', onMouseEnter, {
        once: true,
      });
    }

    trigger.addEventListener('mouseenter', onMouseEnter);
    trigger.addEventListener('mouseleave', onMouseLeave);

    onCleanup(() => {
      trigger.removeEventListener('mouseleave', onScrollMouseLeave);

      if (props.move) {
        trigger.removeEventListener('mousemove', onMouseEnter);
      }

      trigger.removeEventListener('mouseenter', onMouseEnter);
      trigger.removeEventListener('mouseleave', onMouseLeave);
    });
  });

  function setPointerRef(event: PointerEvent) {
    setInstanceState('pointerType', event.pointerType);
  }

  function onMouseMove(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLElement;

    const currentDomReference = store.select('domReferenceElement');
    const allTriggers = store.context.triggerElements;
    const currentOpen = store.select('open');

    const isOverInactiveTrigger =
      (allTriggers.hasElement(event.target as Element) ||
        allTriggers.hasMatchingElement((t) => contains(t, event.target as Element))) &&
      (!currentDomReference || !contains(currentDomReference, event.target as Element));

    if (props.mouseOnly && !isMouseLikePointerType(instance.pointerType)) {
      return;
    }

    if ((currentOpen && !isOverInactiveTrigger) || getRestMs(props.restMs) === 0) {
      return;
    }

    if (
      !isOverInactiveTrigger &&
      instance.restTimeoutPending &&
      event.movementX ** 2 + event.movementY ** 2 < 2
    ) {
      return;
    }

    instance.restTimeout.clear();

    function handleMouseMove() {
      setInstanceState('restTimeoutPending', false);

      // A delayed hover open should not override a click-like open that happened
      // while the hover delay was pending.
      if (isClickLikeOpenEvent()) {
        return;
      }

      const latestOpen = store.select('open');

      if (!instance.blockMouseMove && (!latestOpen || isOverInactiveTrigger)) {
        store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
      }
    }

    if (instance.pointerType === 'touch') {
      handleMouseMove();
    } else if (isOverInactiveTrigger && currentOpen) {
      handleMouseMove();
    } else {
      setInstanceState('restTimeoutPending', true);
      instance.restTimeout.start(getRestMs(props.restMs), handleMouseMove);
    }
  }

  return {
    get onPointerDown() {
      return props.enabled ? setPointerRef : undefined;
    },
    get onPointerEnter() {
      return props.enabled ? setPointerRef : undefined;
    },
    get onMouseMove() {
      return props.enabled ? onMouseMove : undefined;
    },
  };
}
