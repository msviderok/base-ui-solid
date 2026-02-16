import { COMPOSITE_KEYS } from '../../composite/composite';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { splitComponentProps } from '../../solid-helpers';
import { type StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { popupStateMapping as baseMapping } from '../../utils/popupStateMapping';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import { type BaseUIComponentProps } from '../../utils/types';
import { InteractionType } from '../../utils/useEnhancedClickHandler';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus } from '../../utils/useTransitionStatus';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogPopupCssVars } from './DialogPopupCssVars';
import { DialogPopupDataAttributes } from './DialogPopupDataAttributes';

const stateAttributesMapping: StateAttributesMapping<DialogPopup.State> = {
  ...baseMapping,
  ...transitionStatusMapping,
  nestedDialogOpen(value) {
    return value ? { [DialogPopupDataAttributes.nestedDialogOpen]: '' } : null;
  },
};

/**
 * A container for the dialog contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPopup(componentProps: DialogPopup.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, [
    'finalFocus',
    'initialFocus',
  ]);

  const { store } = useDialogRootContext();

  const descriptionElementId = store.useState('descriptionElementId');
  const disablePointerDismissal = store.useState('disablePointerDismissal');
  const floatingRootContext = store.useState('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const nestedOpenDialogCount = store.useState('nestedOpenDialogCount');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const transitionStatus = store.useState('transitionStatus');
  const role = store.useState('role');

  useOpenChangeComplete({
    open,
    ref: store.context.refs.popupRef,
    onComplete() {
      if (open()) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });
  // Default initial focus logic:
  // If opened by touch, focus the popup element to prevent the virtual keyboard from opening
  // (this is required for Android specifically as iOS handles this automatically).
  function defaultInitialFocus(interactionType: InteractionType) {
    if (interactionType === 'touch') {
      return store.context.refs.popupRef;
    }
    return true;
  }

  const resolvedInitialFocus = () =>
    local.initialFocus === undefined ? defaultInitialFocus : local.initialFocus;

  const nestedDialogOpen = () => nestedOpenDialogCount() > 0;

  const state: DialogPopup.State = {
    get open() {
      return open();
    },
    get nested() {
      return nested();
    },
    get transitionStatus() {
      return transitionStatus();
    },
    get nestedDialogOpen() {
      return nestedDialogOpen();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: [
      rootPopupProps,
      {
        get 'aria-labelledby'() {
          return titleElementId() ?? undefined;
        },
        get 'aria-describedby'() {
          return descriptionElementId() ?? undefined;
        },
        get role() {
          return role();
        },
        tabIndex: -1,
        get hidden() {
          return !mounted();
        },
        onKeyDown(event: KeyboardEvent) {
          if (COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
        get style() {
          return {
            [DialogPopupCssVars.nestedDialogs]: nestedOpenDialogCount(),
          };
        },
      },
      elementProps,
    ],
    ref: (el) => {
      store.context.refs.popupRef = el;
      store.useStateSetter('popupElement')(el);
    },
    stateAttributesMapping,
  });

  return (
    <>
      <FloatingFocusManager
        context={floatingRootContext()}
        openInteractionType={openMethod()}
        disabled={!mounted()}
        closeOnFocusOut={!disablePointerDismissal()}
        initialFocus={resolvedInitialFocus()}
        returnFocus={local.finalFocus}
        modal={modal() !== false}
        restoreFocus="popup"
      >
        {element()}
      </FloatingFocusManager>
    </>
  );
}

export interface DialogPopupProps extends BaseUIComponentProps<'div', DialogPopup.State> {
  /**
   * Determines the element to focus when the dialog is opened.
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
        | ((openType: InteractionType) => boolean | HTMLElement | null | void)
      )
    | undefined;
  /**
   * Determines the element to focus when the dialog is closed.
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
        | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
      )
    | undefined;
}

export interface DialogPopupState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  transitionStatus: TransitionStatus;
  /**
   * Whether the dialog is nested within a parent dialog.
   */
  nested: boolean;
  /**
   * Whether the dialog has nested dialogs open.
   */
  nestedDialogOpen: boolean;
}

export namespace DialogPopup {
  export type Props = DialogPopupProps;
  export type State = DialogPopupState;
}
