import { isElement } from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { BaseUIChangeEventDetails } from '../../types';
import { PopupStoreContext, PopupStoreSelectors, PopupStoreState } from '../../utils/popups';
import { SolidStore } from '../../utils/store/SolidStoreV2';
import { useId } from '../../utils/useId';
import { FloatingRootState, FloatingRootStore } from '../components/FloatingRootStoreV2';
import { useFloatingParentNodeId } from '../components/FloatingTree';

export interface UseSyncedFloatingRootContextOptions<State extends PopupStoreState<any>> {
  popupStore: SolidStore<State, PopupStoreContext<any>, PopupStoreSelectors>;
  /**
   * Whether to prevent the auto-emitted `openchange` event.
   */
  noEmit?: boolean | undefined;
  /**
   * Whether the Popup element is passed to Floating UI as the floating element instead of the default Positioner.
   */
  treatPopupAsFloatingElement?: boolean | undefined;
  onOpenChange(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
}

/**
 * Initializes a FloatingRootStore that is kept in sync with the provided PopupStore.
 * The new instance is created only once and updated on every render.
 */
export function useSyncedFloatingRootContext<State extends PopupStoreState<any>>(
  options: UseSyncedFloatingRootContextOptions<State>,
): FloatingRootStore {
  const props = defaultProps(options, { noEmit: false, treatPopupAsFloatingElement: false });

  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  const open = props.popupStore.useState('open');
  const referenceElement = props.popupStore.useState('activeTriggerElement');
  const floatingElement = props.popupStore.useState(
    props.treatPopupAsFloatingElement ? 'popupElement' : 'positionerElement',
  );

  const store = FloatingRootStore({
    get open() {
      return open();
    },
    get referenceElement() {
      return referenceElement();
    },
    get floatingElement() {
      return floatingElement();
    },
    get triggerElements() {
      return options.popupStore.context.triggerElements;
    },
    onOpenChange: options.onOpenChange,
    get floatingId() {
      return floatingId();
    },
    get nested() {
      return nested;
    },
    get noEmit() {
      return props.noEmit;
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

    if (store.state.positionReference === store.state.referenceElement) {
      valuesToSync.positionReference = ref;
    }

    store.update(valuesToSync);
  });

  return store;
}
