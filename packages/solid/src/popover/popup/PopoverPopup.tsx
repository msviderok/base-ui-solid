import { isHTMLElement } from '@floating-ui/utils/dom';
import { COMPOSITE_KEYS } from '../../composite/composite';
import { FloatingFocusManager, useHoverFloatingInteraction } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { getDisabledMountTransitionStyles } from '../../utils/getDisabledMountTransitionStyles';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { REASONS } from '../../utils/reasons';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { InteractionType } from '../../utils/useEnhancedClickHandler';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';

const stateAttributesMapping: StateAttributesMapping<PopoverPopup.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
};

/**
 * A container for the popover contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPopup(componentProps: PopoverPopup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'initialFocus',
    'finalFocus',
  ]);

  const { store } = usePopoverRootContext();

  const positioner = usePopoverPositionerContext();
  const insideToolbar = () => useToolbarRootContext(true) != null;

  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const titleId = store.useState('titleElementId');
  const descriptionId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const openReason = store.useState('openChangeReason');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const floatingContext = store.context.floatingRootContext;

  useOpenChangeComplete({
    open,
    ref: () => store.context.popupRef.current,
    onComplete() {
      if (open()) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  const disabled = store.useState('disabled');
  const openOnHover = store.useState('openOnHover');
  const closeDelay = store.useState('closeDelay');

  useHoverFloatingInteraction({
    context: floatingContext,
    parameters: {
      get enabled() {
        return openOnHover() && !disabled();
      },
      get closeDelay() {
        return closeDelay();
      },
    },
  });

  // Default initial focus logic:
  // If opened by touch, focus the popup element to prevent the virtual keyboard from opening
  // (this is required for Android specifically as iOS handles this automatically).
  function defaultInitialFocus(interactionType: InteractionType) {
    if (interactionType === 'touch') {
      return store.context.popupRef.current;
    }
    return true;
  }

  const resolvedInitialFocus = () =>
    local.initialFocus === undefined ? defaultInitialFocus : local.initialFocus;

  const state: PopoverPopup.State = {
    get open() {
      return open();
    },
    get side() {
      return positioner.side();
    },
    get align() {
      return positioner.align();
    },
    get instant() {
      return instantType();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const setPopupElement = (element: HTMLElement | null | undefined) => {
    store.set('popupElement', element);
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (el) => {
      store.context.popupRef.current = el;
      setPopupElement(el);
    },
    get props() {
      return [
        popupProps(),
        {
          get 'aria-labelledby'() {
            return titleId();
          },
          get 'aria-describedby'() {
            return descriptionId();
          },
          onKeyDown(event: KeyboardEvent) {
            if (insideToolbar() && COMPOSITE_KEYS.has(event.key)) {
              event.stopPropagation();
            }
          },
        },
        getDisabledMountTransitionStyles(transitionStatus()),
        elementProps,
      ];
    },
    stateAttributesMapping,
  });

  return (
    <FloatingFocusManager
      context={floatingContext}
      openInteractionType={openMethod()}
      modal={modal() === 'trap-focus'}
      disabled={!mounted() || openReason() === REASONS.triggerHover}
      initialFocus={resolvedInitialFocus()}
      returnFocus={local.finalFocus}
      restoreFocus="popup"
      previousFocusableElement={
        isHTMLElement(activeTriggerElement()) ? (activeTriggerElement() as HTMLElement) : undefined
      }
      nextFocusableElement={store.context.triggerFocusTargetRef.current}
      beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
    >
      {element()}
    </FloatingFocusManager>
  );
}

export interface PopoverPopupState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  transitionStatus: TransitionStatus;
  instant: 'dismiss' | 'click' | undefined;
}

export interface PopoverPopupProps extends BaseUIComponentProps<'div', PopoverPopup.State> {
  /**
   * Determines the element to focus when the popover is opened.
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
        | ((openType: InteractionType) => void | boolean | HTMLElement | null)
      )
    | undefined;
  /**
   * Determines the element to focus when the popover is closed.
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
        | ((closeType: InteractionType) => void | boolean | HTMLElement | null)
      )
    | undefined;
}

export namespace PopoverPopup {
  export type State = PopoverPopupState;
  export type Props = PopoverPopupProps;
}
