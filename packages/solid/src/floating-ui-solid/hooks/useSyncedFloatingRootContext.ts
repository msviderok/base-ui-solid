import { isElement } from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { type MaybeAccessor, access } from '../../solid-helpers';
import { BaseUIChangeEventDetails } from '../../types';
import { PopupStoreContext, PopupStoreSelectors, PopupStoreState } from '../../utils/popups';
import { SolidStore } from '../../utils/store/SolidStore';
import { useId } from '../../utils/useId';
import { FloatingRootState, FloatingRootStore } from '../components/FloatingRootStore';
import { useFloatingParentNodeId } from '../components/FloatingTree';

export interface UseSyncedFloatingRootContextOptions<State extends PopupStoreState<any>> {
  popupStore: SolidStore<State, PopupStoreContext<any>, PopupStoreSelectors>;
  /**
   * Whether to prevent the auto-emitted `openchange` event.
   */
  noEmit?: boolean;
  /**
   * Whether the Popup element is passed to Floating UI as the floating element instead of the default Positioner.
   */
  treatPopupAsFloatingElement?: MaybeAccessor<boolean | undefined>;
  onOpenChange(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
}

/**
 * Initializes a FloatingRootStore that is kept in sync with the provided PopupStore.
 * The new instance is created only once and updated on every render.
 */
export function useSyncedFloatingRootContext<State extends PopupStoreState<any>>(
  options: UseSyncedFloatingRootContextOptions<State>,
): FloatingRootStore {
  const treatPopupAsFloatingElement = () => access(options.treatPopupAsFloatingElement) ?? false;
  const noEmit = () => options.noEmit ?? false;
  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  const open = options.popupStore.useState('open');
  const referenceElement = options.popupStore.useState('activeTriggerElement');
  const floatingElement = () =>
    options.popupStore.useState(
      treatPopupAsFloatingElement() ? 'popupElement' : 'positionerElement',
    )();

  const store = new FloatingRootStore({
    open,
    referenceElement,
    floatingElement,
    triggerElements: options.popupStore.context.triggerElements,
    onOpenChange: options.onOpenChange,
    floatingId,
    nested,
    get noEmit() {
      return noEmit();
    },
  });

  createEffect(() => {
    const ref = referenceElement();
    const valuesToSync: Partial<FloatingRootState> = {
      open: open(),
      floatingId: floatingId(),
      referenceElement: ref,
      floatingElement: floatingElement(),
    };

    if (isElement(ref)) {
      valuesToSync.domReferenceElement = ref;
    }

    store.update(valuesToSync);
  });

  createEffect(() => {
    // TODO: When `setOpen` is a part of the PopupStore API, we don't need to sync it.
    store.context.onOpenChange = options.onOpenChange;
    store.context.nested = nested;
    store.context.noEmit = noEmit();
  });

  return store;
}
