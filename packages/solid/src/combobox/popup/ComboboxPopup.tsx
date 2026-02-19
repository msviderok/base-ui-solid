import { createMemo } from 'solid-js';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import { splitComponentProps } from '../../solid-helpers';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { InteractionType } from '../../utils/useEnhancedClickHandler';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';

const stateAttributesMapping: StateAttributesMapping<ComboboxPopup.State> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the list.
 * Renders a `<div>` element.
 */
export function ComboboxPopup(componentProps: ComboboxPopup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'initialFocus',
    'finalFocus',
  ]);

  const store = useComboboxRootContext();
  const positioning = useComboboxPositionerContext();
  const floatingRootContext = useComboboxFloatingContext();
  const { filteredItems } = useComboboxDerivedItemsContext();

  const mounted = store.useState('mounted');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const transitionStatus = store.useState('transitionStatus');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const inputElement = store.useState('inputElement');

  const empty = () => filteredItems().length === 0;

  useOpenChangeComplete({
    open,
    ref: store.state.popupRef,
    onComplete() {
      if (open()) {
        store.state.onOpenChangeComplete(true);
      }
    },
  });

  const state: ComboboxPopup.State = {
    get open() {
      return open();
    },
    get side() {
      return positioning.side();
    },
    get align() {
      return positioning.align();
    },
    get anchorHidden() {
      return positioning.anchorHidden();
    },
    get transitionStatus() {
      return transitionStatus();
    },
    get empty() {
      return empty();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      store.setState('popupRef', el);
    },
    get props() {
      return [
        {
          get role() {
            return inputInsidePopup() ? 'dialog' : 'presentation';
          },
          tabIndex: -1,
          onFocus(event: FocusEvent) {
            const target = getTarget(event) as Element | null;
            if (
              openMethod() !== 'touch' &&
              (contains(store.state.listElement, target) || target === event.currentTarget)
            ) {
              store.state.inputRef?.focus();
            }
          },
        },
        getDisabledMountTransitionStyles(transitionStatus()),
        elementProps,
      ];
    },
    stateAttributesMapping,
  });

  // Default initial focus logic:
  // If opened by touch, focus the popup element to prevent the virtual keyboard from opening
  // (this is required for Android specifically as iOS handles this automatically).
  const computedDefaultInitialFocus = createMemo(() =>
    inputInsidePopup()
      ? (interactionType: InteractionType) =>
          interactionType === 'touch' ? store.state.popupRef : inputElement()
      : false,
  );

  const resolvedInitialFocus = createMemo(() =>
    local.initialFocus === undefined ? computedDefaultInitialFocus() : local.initialFocus,
  );

  const resolvedFinalFocus = createMemo(() => {
    if (local.finalFocus != null) {
      return local.finalFocus;
    }

    return inputInsidePopup() ? undefined : false;
  });

  return (
    <FloatingFocusManager
      context={floatingRootContext}
      disabled={!mounted()}
      modal={!inputInsidePopup()}
      openInteractionType={openMethod()}
      initialFocus={resolvedInitialFocus()}
      returnFocus={resolvedFinalFocus()}
    >
      {element()}
    </FloatingFocusManager>
  );
}

export interface ComboboxPopupState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  transitionStatus: TransitionStatus;
  empty: boolean;
}

export interface ComboboxPopupProps extends BaseUIComponentProps<'div', ComboboxPopup.State> {
  /**
   * Determines the element to focus when the popup is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | (
        | boolean
        | HTMLElement
        | null
        | ((openType: InteractionType) => void | boolean | HTMLElement | undefined | null)
      )
    | undefined;
  /**
   * Determines the element to focus when the popup is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | (
        | boolean
        | HTMLElement
        | null
        | ((closeType: InteractionType) => void | boolean | HTMLElement | undefined | null)
      )
    | undefined;
}

export namespace ComboboxPopup {
  export type State = ComboboxPopupState;
  export type Props = ComboboxPopupProps;
}
