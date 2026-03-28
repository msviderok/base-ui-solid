import { createEffect } from 'solid-js';
import {
  safePolygon,
  useDelayGroup,
  useFocus,
  useHoverReferenceInteraction,
} from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useTriggerDataForwarding } from '../../utils/popups';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTooltipProviderContext } from '../provider/TooltipProviderContext';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipHandle } from '../store/TooltipHandle';
import type { TooltipStore } from '../store/TooltipStore';
import { OPEN_DELAY } from '../utils/constants';
import { TooltipTriggerDataAttributes } from './TooltipTriggerDataAttributes';

/**
 * An element to attach the tooltip to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipTrigger<Payload>(componentProps: TooltipTrigger.Props<Payload>) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'handle',
    'payload',
    'disabled',
    'delay',
    'closeDelay',
    'id',
  ]);
  const disabledProp = () => local.disabled ?? false;
  const idProp = () => local.id;

  const rootContext = useTooltipRootContext(true);
  const store = (local.handle?.store ?? rootContext?.store) as TooltipStore<unknown>;

  createEffect(() => {
    if (!store) {
      throw new Error(
        'Base UI: <Tooltip.Trigger> must be either used within a <Tooltip.Root> component or provided with a handle.',
      );
    }
  });

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);

  let triggerElementRef = null as Element | null | undefined;

  const delayWithDefault = () => local.delay ?? OPEN_DELAY;
  const closeDelayWithDefault = () => local.closeDelay ?? 0;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding({
    get triggerId() {
      return thisTriggerId();
    },
    get triggerElement() {
      return triggerElementRef;
    },
    get store() {
      return store;
    },
    stateUpdates: {
      get payload() {
        return local.payload;
      },
      get closeDelay() {
        return closeDelayWithDefault();
      },
    },
  });

  const providerContext = useTooltipProviderContext();
  const { delayRef, isInstantPhase, hasProvider } = useDelayGroup({
    get context() {
      return store.context.floatingRootContext;
    },
    options: {
      get open() {
        return isOpenedByThisTrigger();
      },
    },
  });

  store.useSyncedValue('isInstantPhase', isInstantPhase);

  const rootDisabled = store.useState('disabled');
  const disabled = () => disabledProp() ?? rootDisabled();
  const trackCursorAxis = store.useState('trackCursorAxis');
  const disableHoverablePopup = store.useState('disableHoverablePopup');

  const hoverProps = useHoverReferenceInteraction({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return !disabled();
      },
      mouseOnly: true,
      move: false,
      get handleClose() {
        return !disableHoverablePopup() && trackCursorAxis() !== 'both' ? safePolygon() : null;
      },
      restMs() {
        const providerDelay = providerContext?.delay();
        const delayRefValue = delayRef.current;
        const groupOpenValue = typeof delayRefValue === 'object' ? delayRefValue.open : undefined;

        let computedRestMs = delayWithDefault();
        if (hasProvider) {
          if (groupOpenValue !== 0) {
            computedRestMs = local.delay ?? providerDelay ?? delayWithDefault();
          } else {
            computedRestMs = 0;
          }
        }

        return computedRestMs;
      },
      delay() {
        const delayRefValue = delayRef.current;
        const closeValue = typeof delayRefValue === 'object' ? delayRefValue.close : undefined;

        let computedCloseDelay: number | undefined = closeDelayWithDefault();
        if (local.closeDelay == null && hasProvider) {
          computedCloseDelay = closeValue;
        }

        return {
          close: computedCloseDelay,
        };
      },
      get triggerElementRef() {
        return triggerElementRef;
      },
      get isActiveTrigger() {
        return isTriggerActive();
      },
    },
  });

  const focus = useFocus({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get enabled() {
        return !disabled();
      },
    },
  });

  const state: TooltipTrigger.State = {
    get open() {
      return isOpenedByThisTrigger();
    },
  };

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger);

  const element = useRenderElement('button', componentProps, {
    state,
    ref: (el) => {
      registerTrigger(el);
      triggerElementRef = el;
    },
    get props() {
      return [
        hoverProps,
        focus.reference,
        rootTriggerProps(),
        {
          get id() {
            return thisTriggerId();
          },
          get [TooltipTriggerDataAttributes.triggerDisabled]() {
            return disabled() ? '' : undefined;
          },
        },
        elementProps,
      ];
    },
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export interface TooltipTriggerState {
  /**
   * Whether the tooltip is currently open.
   */
  open: boolean;
}

export interface TooltipTriggerProps<Payload = unknown> extends BaseUIComponentProps<
  'button',
  TooltipTrigger.State
> {
  /**
   * A handle to associate the trigger with a tooltip.
   */
  handle?: TooltipHandle<Payload> | undefined;
  /**
   * A payload to pass to the tooltip when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before opening the tooltip. Specified in milliseconds.
   * @default 600
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the tooltip. Specified in milliseconds.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * If `true`, the tooltip will not open when interacting with this trigger.
   * Note that this doesn't apply the `disabled` attribute to the trigger element.
   * If you want to disable the trigger element itself, you can pass the `disabled` prop to the trigger element via the `render` prop.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace TooltipTrigger {
  export type State = TooltipTriggerState;
  export type Props<Payload = unknown> = TooltipTriggerProps<Payload>;
}
