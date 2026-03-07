import { createEffect } from 'solid-js';
import { safePolygon, useFocus, useHoverReferenceInteraction } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useTriggerDataForwarding } from '../../utils/popups';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps, HTMLProps } from '../../utils/types';
import { useBaseUiId } from '../../utils/useBaseUiId';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { PreviewCardHandle } from '../store/PreviewCardHandle';
import type { PreviewCardStore } from '../store/PreviewCardStore';
import { CLOSE_DELAY, OPEN_DELAY } from '../utils/constants';

/**
 * A link that opens the preview card.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardTrigger<Payload>(componentProps: PreviewCardTrigger.Props<Payload>) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'delay',
    'closeDelay',
    'id',
    'payload',
    'handle',
  ]);
  const idProp = () => local.id;
  const delayWithDefault = () => local.delay ?? OPEN_DELAY;
  const closeDelayWithDefault = () => local.closeDelay ?? CLOSE_DELAY;

  const rootContext = usePreviewCardRootContext(true);
  const store = local.handle?.store ?? rootContext?.store;
  if (!store) {
    throw new Error(
      'Base UI: <PreviewCard.Trigger> must be either used within a <PreviewCard.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);

  let triggerElementRef = null as Element | null | undefined;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding({
    get triggerId() {
      return thisTriggerId();
    },
    get triggerElement() {
      return triggerElementRef;
    },
    get store() {
      return store as PreviewCardStore<Payload>;
    },
    stateUpdates: {
      get payload() {
        return local.payload;
      },
    },
  });

  createEffect(() => {
    if (isMountedByThisTrigger()) {
      store.context.closeDelayRef.current = closeDelayWithDefault();
    }
  });

  const hoverProps = useHoverReferenceInteraction({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      mouseOnly: true,
      move: false,
      handleClose: safePolygon(),
      delay: () => ({ open: delayWithDefault(), close: closeDelayWithDefault() }),
      get triggerElementRef() {
        return triggerElementRef;
      },
      get isActiveTrigger() {
        return isTriggerActive();
      },
    },
  });

  const focusProps = useFocus({
    get context() {
      return store.context.floatingRootContext;
    },
    props: {
      get delay() {
        return delayWithDefault();
      },
    },
  });

  const state: PreviewCardTrigger.State = {
    get open() {
      return isOpenedByThisTrigger();
    },
  };

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger);

  const element = useRenderElement('a', componentProps, {
    state,
    ref: (el) => {
      registerTrigger(el);
      triggerElementRef = el;
    },
    get props() {
      return [
        hoverProps,
        focusProps.reference as HTMLProps,
        rootTriggerProps(),
        {
          get id() {
            return thisTriggerId();
          },
        },
        elementProps,
      ];
    },
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export interface PreviewCardTriggerState {
  /**
   * Whether the preview card is currently open.
   */
  open: boolean;
}

export interface PreviewCardTriggerProps<Payload = unknown> extends BaseUIComponentProps<
  'a',
  PreviewCardTrigger.State
> {
  /**
   * A handle to associate the trigger with a preview card.
   */
  handle?: PreviewCardHandle<Payload> | undefined;
  /**
   * A payload to pass to the preview card when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the preview card opens. Specified in milliseconds.
   * @default 600
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the preview card. Specified in milliseconds.
   * @default 300
   */
  closeDelay?: number | undefined;
}

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props<Payload = unknown> = PreviewCardTriggerProps<Payload>;
}
