import { mergeProps } from '@msviderok/base-ui-solid/merge-props';
import type { PopoverStore } from '@msviderok/base-ui-solid/popover/store/PopoverStore';
import { Show, type JSX } from 'solid-js';
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
import { access, splitComponentProps } from '../../solid-helpers';
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
import { OPEN_DELAY } from '../utils/constants';

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverTrigger = ((componentProps: PopoverTrigger.Props) => {
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
  const store = () => (local.handle?.store ?? rootContext?.store) as PopoverStore<unknown>;
  if (!store) {
    throw new Error(
      'Base UI: <Popover.Trigger> must be either used within a <Popover.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = () => store()?.useState('isTriggerActive', thisTriggerId())();
  const floatingContext = () => store()?.useState('floatingRootContext')();
  const isOpenedByThisTrigger = () => store()?.useState('isOpenedByTrigger', thisTriggerId())();

  let triggerElementRef = null as HTMLElement | null | undefined;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    {
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
  );

  const openReason = () => store()?.useState('openChangeReason')();
  const stickIfOpen = () => store()?.useState('stickIfOpen')();
  const openMethod = () => store()?.useState('openMethod')();

  const hoverProps = useHoverReferenceInteraction(floatingContext, {
    enabled: () =>
      floatingContext() != null &&
      openOnHover() &&
      (openMethod() !== 'touch' || openReason() !== REASONS.triggerPress),
    mouseOnly: true,
    move: false,
    handleClose: safePolygon(),
    restMs: delay,
    delay: () => ({
      close: closeDelay(),
    }),
    triggerElementRef,
    isActiveTrigger: isTriggerActive,
  });

  const click = useClick(floatingContext, {
    enabled: () => floatingContext() != null,
    stickIfOpen,
  });

  const localProps = useInteractions([click]);

  const rootTriggerProps = () => store()?.useState('triggerProps', isMountedByThisTrigger())();

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
    props: [
      (p) => mergeProps(p, localProps.getReferenceProps()),
      hoverProps,
      rootTriggerProps,
      {
        [CLICK_TRIGGER_IDENTIFIER as string]: '',
        get id() {
          return thisTriggerId();
        },
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  let preFocusGuardRef = null as HTMLElement | null | undefined;

  const handlePreFocusGuardFocus = (event: FocusEvent) => {
    store().setOpen(
      false,
      createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
    );

    const previousTabbable: FocusableElement | null = getTabbableBeforeElement(preFocusGuardRef);
    previousTabbable?.focus();
  };

  const handleFocusTargetFocus = (event: FocusEvent) => {
    const positionerElement = access(store()?.select('positionerElement'));
    if (positionerElement && isOutsideEvent(event, positionerElement)) {
      store()?.context.refs.beforeContentFocusGuardRef?.focus();
    } else {
      store()?.setOpen(
        false,
        createChangeEventDetails(REASONS.focusOut, event, event.currentTarget as HTMLElement),
      );

      let nextTabbable = getTabbableAfterElement(
        store()?.context.refs.triggerFocusTargetRef || triggerElementRef,
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

  // A fragment with key is required to ensure that the `element` is mounted to the same DOM node
  // regardless of whether the focus guards are rendered or not.
  return (
    <Show when={isTriggerActive()} fallback={element()}>
      <>
        <FocusGuard
          ref={(el) => {
            preFocusGuardRef = el;
          }}
          onFocus={handlePreFocusGuardFocus}
        />
        {element()}
        <FocusGuard
          ref={(el) => {
            if (store()) {
              store().context.refs.triggerFocusTargetRef = el;
            }
          }}
          onFocus={handleFocusTargetFocus}
        />
      </>
    </Show>
  );
}) as PopoverTrigger;

export interface PopoverTrigger {
  <Payload>(componentProps: PopoverTriggerProps<Payload>): JSX.Element;
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
    nativeButton?: boolean;
    /**
     * A handle to associate the trigger with a popover.
     */
    handle?: PopoverHandle<Payload>;
    /**
     * A payload to pass to the popover when it is opened.
     */
    payload?: Payload;
    /**
     * ID of the trigger. In addition to being forwarded to the rendered element,
     * it is also used to specify the active trigger for the popover in controlled mode (with the PopoverRoot `triggerId` prop).
     */
    id?: string;
    /**
     * Whether the popover should also open when the trigger is hovered.
     * @default false
     */
    openOnHover?: boolean;
    /**
     * How long to wait before the popover may be opened on hover. Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 300
     */
    delay?: number;
    /**
     * How long to wait before closing the popover that was opened on hover.
     * Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 0
     */
    closeDelay?: number;
  };

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}
