import { createEffect, createMemo, createSignal, onMount } from 'solid-js';
import {
  useDismiss,
  useInteractions,
  useRole,
  useSyncedFloatingRootContext,
} from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { useImplicitActiveTrigger, useOpenStateTransitions } from '../../utils/popups';
import { REASONS } from '../../utils/reasons';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { useScrollLock } from '../../utils/useScrollLock';
import { type DialogStore } from '../store/DialogStore';
import { type DialogRoot } from './DialogRoot';

export function useDialogRoot(params: useDialogRoot.Parameters): useDialogRoot.ReturnValue {
  const open = params.store.useState('open');
  const disablePointerDismissal = params.store.useState('disablePointerDismissal');
  const modal = params.store.useState('modal');
  const popupElement = params.store.useState('popupElement');

  const {
    openMethod,
    triggerProps,
    reset: resetOpenInteractionType,
  } = useOpenInteractionType(open);

  useImplicitActiveTrigger({ store: params.store });
  const { forceUnmount } = useOpenStateTransitions({
    get open() {
      return open();
    },
    store: params.store,
    onUnmount: () => {
      resetOpenInteractionType();
    },
  });

  const createDialogEventDetails = (reason: DialogRoot.ChangeEventReason) => {
    const details: DialogRoot.ChangeEventDetails =
      createChangeEventDetails<DialogRoot.ChangeEventReason>(
        reason,
      ) as DialogRoot.ChangeEventDetails;
    details.preventUnmountOnClose = () => {
      params.store.set('preventUnmountingOnClose', true);
    };

    return details;
  };

  const handleImperativeClose = () => {
    params.store.setOpen(false, createDialogEventDetails(REASONS.imperativeAction));
  };

  const floatingRootContext = useSyncedFloatingRootContext({
    popupStore: params.store,
    onOpenChange: params.store.setOpen,
    treatPopupAsFloatingElement: true,
    noEmit: true,
  });

  params.store.context.floatingRootContext = floatingRootContext;

  onMount(() => {
    if (params.actionsRef) {
      params.actionsRef.current = { unmount: forceUnmount, close: handleImperativeClose };
    }
  });

  const [ownNestedOpenDialogs, setOwnNestedOpenDialogs] = createSignal(0);
  const isTopmost = () => ownNestedOpenDialogs() === 0;

  const role = useRole({ context: floatingRootContext });
  const dismiss = useDismiss({
    context: floatingRootContext,
    props: {
      outsidePressEvent() {
        if (
          params.store.context.internalBackdropRef.current ||
          params.store.context.backdropRef.current
        ) {
          return 'intentional';
        }
        // Ensure `aria-hidden` on outside elements is removed immediately
        // on outside press when trapping focus.
        return {
          mouse: modal() === 'trap-focus' ? 'sloppy' : 'intentional',
          touch: 'sloppy',
        };
      },
      outsidePress(event) {
        if (!params.store.context.outsidePressEnabledRef.current) {
          return false;
        }

        // For mouse events, only accept left button (button 0)
        // For touch events, a single touch is equivalent to left button
        if ('button' in event && event.button !== 0) {
          return false;
        }
        if ('touches' in event && event.touches.length !== 1) {
          return false;
        }
        const target = getTarget(event) as Element | null;
        if (isTopmost() && !disablePointerDismissal()) {
          const eventTarget = target as Element | null;
          // Only close if the click occurred on the dialog's owning backdrop.
          // This supports multiple modal dialogs that aren't nested in the React tree:
          // https://github.com/mui/base-ui/issues/1320
          if (modal()) {
            return params.store.context.internalBackdropRef.current ||
              params.store.context.backdropRef.current
              ? params.store.context.internalBackdropRef.current === eventTarget ||
                  params.store.context.backdropRef.current === eventTarget ||
                  (contains(eventTarget, popupElement()) &&
                    !eventTarget?.hasAttribute('data-base-ui-portal'))
              : true;
          }
          return true;
        }
        return false;
      },
      get escapeKey() {
        return isTopmost();
      },
    },
  });

  useScrollLock({
    enabled: () => open() && modal() === true,
    referenceElement: popupElement,
  });

  const { getReferenceProps, getFloatingProps, getTriggerProps } = useInteractions([role, dismiss]);

  // Listen for nested open/close events on this store to maintain the count
  params.store.useContextCallback('onNestedDialogOpen', (ownChildrenCount) => {
    setOwnNestedOpenDialogs(ownChildrenCount + 1);
  });

  params.store.useContextCallback('onNestedDialogClose', () => {
    setOwnNestedOpenDialogs(0);
  });

  // Notify parent of our open/close state using parent callbacks, if any
  createEffect(() => {
    if (params.parentContext?.onNestedDialogOpen && open()) {
      params.parentContext.onNestedDialogOpen(ownNestedOpenDialogs());
    }
    if (params.parentContext?.onNestedDialogClose && !open()) {
      params.parentContext.onNestedDialogClose();
    }
    return () => {
      if (params.parentContext?.onNestedDialogClose && open()) {
        params.parentContext.onNestedDialogClose();
      }
    };
  });

  const activeTriggerProps = createMemo(() => getReferenceProps(triggerProps));
  const inactiveTriggerProps = createMemo(() => getTriggerProps(triggerProps));
  const popupProps = createMemo(() => getFloatingProps());

  params.store.useSyncedValues({
    openMethod,
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    nestedOpenDialogCount: ownNestedOpenDialogs,
  });
}

export interface UseDialogRootSharedParameters {}

export interface UseDialogRootParameters {
  store: DialogStore<any>;
  actionsRef?: DialogRoot.Props['actionsRef'] | undefined;
  parentContext?: DialogStore<unknown>['context'] | undefined;
  onOpenChange: DialogRoot.Props['onOpenChange'];
  triggerIdProp?: (string | null) | undefined;
}

export type UseDialogRootReturnValue = void;

export namespace useDialogRoot {
  export type SharedParameters = UseDialogRootSharedParameters;
  export type Parameters = UseDialogRootParameters;
  export type ReturnValue = UseDialogRootReturnValue;
}
