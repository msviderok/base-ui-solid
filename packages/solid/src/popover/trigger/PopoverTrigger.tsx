import { Show } from 'solid-js';
import { type FocusableElement } from 'tabbable';
import {
  safePolygon,
  useClick,
  useHoverReferenceInteraction,
  useInteractions,
} from '../../floating-ui-solid';
import {
  contains,
  getNextTabbable,
  getTabbableAfterElement,
  getTabbableBeforeElement,
  isOutsideEvent,
} from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { useButton } from '../../use-button/useButton';
import { CLICK_TRIGGER_IDENTIFIER } from '../../utils/constants';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { FocusGuard } from '../../utils/FocusGuard';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTriggerDataForwarding } from '../../utils/popups';
import {
  pressableTriggerOpenStateMapping,
  triggerOpenStateMapping,
} from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import type { BaseUIComponentProps, NativeButtonProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverHandle } from '../store/PopoverHandle';
import type { PopoverStore } from '../store/PopoverStore';
import { OPEN_DELAY } from '../utils/constants';

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverTrigger<Payload>(componentProps: PopoverTrigger.Props<Payload>) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'disabled',
    'nativeButton',
    'handle',
    'payload',
    'openOnHover',
    'delay',
    'closeDelay',
    'id',
  ]);

  const disabled = () => local.disabled ?? false;
  const nativeButton = () => local.nativeButton ?? true;
  const openOnHover = () => local.openOnHover ?? false;
  const delay = () => local.delay ?? OPEN_DELAY;
  const closeDelay = () => local.closeDelay ?? 0;
  const idProp = () => local.id;

  const rootContext = usePopoverRootContext(true);
  const store = local.handle?.store ?? rootContext?.store;
  if (!store) {
    throw new Error(
      'Base UI: <Popover.Trigger> must be either used within a <Popover.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);

  let triggerElementRef = null as HTMLElement | null | undefined;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding({
    get triggerId() {
      return thisTriggerId();
    },
    get triggerElement() {
      return triggerElementRef;
    },
    get store() {
      return store as PopoverStore<unknown>;
    },
    stateUpdates: {
      get payload() {
        return local.payload;
      },
      get disabled() {
        return disabled();
      },
      get openOnHover() {
        return openOnHover();
      },
      get closeDelay() {
        return closeDelay();
      },
    },
  });

  const openReason = store.useState('openChangeReason');
  const stickIfOpen = store.useState('stickIfOpen');
  const openMethod = store.useState('openMethod');

  const hoverProps = useHoverReferenceInteraction({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return openOnHover() && (openMethod() !== 'touch' || openReason() !== REASONS.triggerPress);
      },
      mouseOnly: true,
      move: false,
      handleClose: safePolygon(),
      get restMs() {
        return delay();
      },
      delay: () => ({
        close: closeDelay(),
      }),
      get triggerElementRef() {
        return triggerElementRef;
      },
      get isActiveTrigger() {
        return isTriggerActive();
      },
    },
  });

  const click = useClick({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      enabled: true,
      get stickIfOpen() {
        return stickIfOpen();
      },
    },
  });

  const localProps = useInteractions([click]);

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger);

  const state: PopoverTrigger.State = {
    get disabled() {
      return disabled();
    },
    get open() {
      return isOpenedByThisTrigger();
    },
  };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const stateAttributesMapping: StateAttributesMapping<{ open: boolean }> = {
    open(value) {
      if (value && openReason() === REASONS.triggerPress) {
        return pressableTriggerOpenStateMapping.open(value);
      }

      return triggerOpenStateMapping.open(value);
    },
  };

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      buttonRef(el);
      registerTrigger(el);
      triggerElementRef = el;
    },
    get props() {
      return [
        localProps.getReferenceProps(),
        hoverProps,
        rootTriggerProps(),
        {
          [CLICK_TRIGGER_IDENTIFIER as string]: '',
          get id() {
            return thisTriggerId();
          },
        },
        elementProps,
        getButtonProps,
      ];
    },
    stateAttributesMapping,
  });

  let preFocusGuardRef = null as HTMLElement | null | undefined;

  const handlePreFocusGuardFocus = (event: FocusEvent) => {
    store.setOpen(
      false,
      createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
    );

    const previousTabbable: FocusableElement | null = getTabbableBeforeElement(preFocusGuardRef);
    previousTabbable?.focus();
  };

  const handleFocusTargetFocus = (event: FocusEvent) => {
    const positionerElement = store.select('positionerElement');
    if (positionerElement && isOutsideEvent(event, positionerElement)) {
      store.context.beforeContentFocusGuardRef.current?.focus();
    } else {
      store.setOpen(
        false,
        createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
      );

      let nextTabbable = getTabbableAfterElement(
        store.context.triggerFocusTargetRef.current || triggerElementRef,
      );

      while (nextTabbable !== null && contains(positionerElement, nextTabbable)) {
        const prevTabbable = nextTabbable;
        nextTabbable = getNextTabbable(nextTabbable);
        if (nextTabbable === prevTabbable) {
          break;
        }
      }

      nextTabbable?.focus();
    }
  };

  return (
    <>
      <Show when={isTriggerActive()}>
        <FocusGuard
          ref={(el) => {
            preFocusGuardRef = el;
          }}
          onFocus={handlePreFocusGuardFocus}
        />
      </Show>
      {element()}
      <Show when={isTriggerActive()}>
        <FocusGuard
          ref={(el) => {
            store.context.triggerFocusTargetRef.current = el;
          }}
          onFocus={handleFocusTargetFocus}
        />
      </Show>
    </>
  );
}

export interface PopoverTriggerState {
  /**
   * Whether the popover is currently disabled.
   */
  disabled: boolean;
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
}

export type PopoverTriggerProps<Payload = unknown> = NativeButtonProps &
  BaseUIComponentProps<'button', PopoverTriggerState> & {
    /**
     * Whether the component renders a native `<button>` element when replacing it
     * via the `render` prop.
     * Set to `false` if the rendered element is not a button (e.g. `<div>`).
     * @default true
     */
    nativeButton?: boolean | undefined;
    /**
     * A handle to associate the trigger with a popover.
     */
    handle?: PopoverHandle<Payload> | undefined;
    /**
     * A payload to pass to the popover when it is opened.
     */
    payload?: Payload | undefined;
    /**
     * ID of the trigger. In addition to being forwarded to the rendered element,
     * it is also used to specify the active trigger for the popover in controlled mode (with the PopoverRoot `triggerId` prop).
     */
    id?: string | undefined;
    /**
     * Whether the popover should also open when the trigger is hovered.
     * @default false
     */
    openOnHover?: boolean | undefined;
    /**
     * How long to wait before the popover may be opened on hover. Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 300
     */
    delay?: number | undefined;
    /**
     * How long to wait before closing the popover that was opened on hover.
     * Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 0
     */
    closeDelay?: number | undefined;
  };

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}
