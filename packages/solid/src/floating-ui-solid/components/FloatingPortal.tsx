import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { createChangeEventDetails } from '@msviderok/base-ui-solid/utils/createBaseUIEventDetails';
import { REASONS } from '@msviderok/base-ui-solid/utils/reasons';
import type { BaseUIComponentProps } from '@msviderok/base-ui-solid/utils/types';
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  splitProps,
  useContext,
  type Accessor,
  type JSX,
  type Ref,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { ownerVisuallyHidden } from '../../utils/constants';
import { FocusGuard } from '../../utils/FocusGuard';
import { useId } from '../../utils/useId';
import { useRenderElement } from '../../utils/useRenderElement';
import {
  disableFocusInside,
  enableFocusInside,
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
} from '../utils';
import { createAttribute } from '../utils/createAttribute';

type FocusManagerState = null | {
  modal: boolean;
  open: boolean;
  onOpenChange(
    open: boolean,
    data?: { reason?: string | undefined; event?: Event | undefined },
  ): void;
  domReference: Element | null | undefined;
  closeOnFocusOut: boolean;
};

const PortalContext = createContext<{
  portalNode: Accessor<HTMLElement | null | undefined>;
  setFocusManagerState: (state: FocusManagerState | null | undefined) => void;
  beforeInsideRef: Accessor<HTMLSpanElement | null | undefined>;
  setBeforeInsideRef: (el: HTMLSpanElement | null | undefined) => void;
  afterInsideRef: Accessor<HTMLSpanElement | null | undefined>;
  setAfterInsideRef: (el: HTMLSpanElement | null | undefined) => void;
  beforeOutsideRef: Accessor<HTMLSpanElement | null | undefined>;
  setBeforeOutsideRef: (el: HTMLSpanElement | null | undefined) => void;
  afterOutsideRef: Accessor<HTMLSpanElement | null | undefined>;
  setAfterOutsideRef: (el: HTMLSpanElement | null | undefined) => void;
}>();

export const usePortalContext = () => useContext(PortalContext);

const attr = createAttribute('portal');

export interface UseFloatingPortalNodeProps {
  ref?: Ref<HTMLDivElement> | undefined;
  container?: (HTMLElement | ShadowRoot | null) | undefined;
  componentProps?: useRenderElement.ComponentProps<any, any> | undefined;
  elementProps?: useRenderElement.ComponentProps<any, HTMLDivElement> | undefined;
}

export interface UseFloatingPortalNodeResult {
  portalNode: Accessor<HTMLElement | null>;
  portalSubtree: Accessor<JSX.Element | null>;
}

/**
 * @see https://floating-ui.com/docs/FloatingPortal#usefloatingportalnode
 */
export function useFloatingPortalNode(
  props: UseFloatingPortalNodeProps = {},
): UseFloatingPortalNodeResult {
  const uniqueId = useId();
  const portalContext = usePortalContext();

  const [portalNode, setPortalNode] = createSignal<HTMLElement | null>(null);

  const containerElement = createMemo(
    () => props.container ?? portalContext?.portalNode() ?? document.body,
  );

  const portalElement = useRenderElement('div', props.componentProps ?? EMPTY_OBJECT, {
    ref: (el: HTMLDivElement) => {
      setPortalNode(el);
      if (typeof props.ref === 'function') {
        props.ref(el);
      } else {
        props.ref = el;
      }
    },
    get props() {
      return [
        {
          id: uniqueId(),
          [attr]: '',
        },
        props.elementProps as any,
      ];
    },
  });

  const portalSubtree = createMemo(() => {
    const container = containerElement();
    if (!container) {
      return null;
    }
    return <Portal mount={container}>{portalElement()}</Portal>;
  });

  return { portalSubtree, portalNode };
}

/**
 * Portals the floating element into a given container element — by default,
 * outside of the app root and into the body.
 * This is necessary to ensure the floating element can appear outside any
 * potential parent containers that cause clipping (such as `overflow: hidden`),
 * while retaining its location in the React tree.
 * @see https://floating-ui.com/docs/FloatingPortal
 * @internal
 */
export function FloatingPortal(
  componentProps: FloatingPortal.Props<any> & { renderGuards?: boolean | undefined },
): JSX.Element {
  const [local, , elementProps] = splitProps(
    componentProps,
    ['container', 'class', 'render', 'renderGuards'],
    ['children'],
  );

  const { portalNode, portalSubtree } = useFloatingPortalNode({
    get container() {
      return local.container;
    },
    ref: (el) => {
      if (typeof componentProps.ref === 'function') {
        componentProps.ref(el);
      } else {
        componentProps.ref = el;
      }
    },
    componentProps: local,
    elementProps: elementProps as any,
  });
  const [beforeOutsideRef, setBeforeOutsideRef] = createSignal<HTMLSpanElement | null>(null);
  const [afterOutsideRef, setAfterOutsideRef] = createSignal<HTMLSpanElement | null>(null);
  const [beforeInsideRef, setBeforeInsideRef] = createSignal<HTMLSpanElement | null>(null);
  const [afterInsideRef, setAfterInsideRef] = createSignal<HTMLSpanElement | null>(null);

  const [focusManagerState, setFocusManagerState] = createSignal<FocusManagerState>(null);

  // Make sure elements inside the portal element are tabbable only when the
  // portal has already been focused, either by tabbing into a focus trap
  // element outside or using the mouse.
  function onFocus(event: FocusEvent) {
    const node = portalNode();
    if (node && event.relatedTarget && isOutsideEvent(event, node)) {
      const focusing = event.type === 'focusin';
      const manageFocus = focusing ? enableFocusInside : disableFocusInside;
      manageFocus(node);
    }
  }

  const shouldRenderGuards = createMemo(() =>
    typeof local.renderGuards === 'boolean'
      ? local.renderGuards!
      : !!focusManagerState() &&
        !focusManagerState()!.modal &&
        focusManagerState()!.open &&
        !!portalNode(),
  );

  createEffect(() => {
    const node = portalNode();
    if (!node || focusManagerState()?.modal) {
      return;
    }

    // Listen to the event on the capture phase so they run before the focus
    // trap elements onFocus prop is called.
    node.addEventListener('focusin', onFocus, true);
    node.addEventListener('focusout', onFocus, true);
    onCleanup(() => {
      node.removeEventListener('focusin', onFocus, true);
      node.removeEventListener('focusout', onFocus, true);
    });
  });

  createEffect(() => {
    const node = portalNode();
    if (!node) {
      return;
    }

    if (focusManagerState()?.open) {
      return;
    }

    enableFocusInside(node);
  });

  const portalContextValue = {
    beforeOutsideRef,
    afterOutsideRef,
    beforeInsideRef,
    afterInsideRef,
    portalNode,
    setFocusManagerState,
    setBeforeOutsideRef,
    setAfterOutsideRef,
    setBeforeInsideRef,
    setAfterInsideRef,
  };

  return (
    <>
      {portalSubtree()}
      <PortalContext.Provider value={portalContextValue}>
        <Show when={shouldRenderGuards() && portalNode()}>
          <FocusGuard
            data-type="outside"
            ref={setBeforeOutsideRef}
            onFocus={(event) => {
              const node = portalNode()!;
              if (isOutsideEvent(event, node)) {
                // In Solid, `onFocus` maps to the non-bubbling native `focus` event, which fires
                // before `focusin`. The portal node's capture `focusin` listener calls
                // `enableFocusInside` too late relative to the inside guard's `onFocus` handler.
                // Explicitly re-enable here so the inside guard's tabbable search works correctly.
                enableFocusInside(node);
                beforeInsideRef()?.focus();
              } else {
                const domReference = focusManagerState()?.domReference ?? null;
                const prevTabbable = getPreviousTabbable(domReference);
                prevTabbable?.focus();
              }
            }}
          />
        </Show>

        <Show when={shouldRenderGuards() && portalNode()}>
          <span aria-owns={portalNode()!.id} style={ownerVisuallyHidden} />
        </Show>

        <Show when={portalNode()}>
          <Portal mount={portalNode()!}>{componentProps.children}</Portal>
        </Show>

        <Show when={shouldRenderGuards() && portalNode()}>
          <FocusGuard
            data-type="outside"
            ref={setAfterOutsideRef}
            onFocus={(event) => {
              const node = portalNode()!;
              if (isOutsideEvent(event, node)) {
                enableFocusInside(node);
                afterInsideRef()?.focus();
              } else {
                const domReference = focusManagerState()?.domReference ?? null;
                const nextTabbable = getNextTabbable(domReference!);
                nextTabbable?.focus();

                if (focusManagerState()?.closeOnFocusOut) {
                  focusManagerState()?.onOpenChange(
                    false,
                    createChangeEventDetails(REASONS.focusOut, event),
                  );
                }
              }
            }}
          />
        </Show>
      </PortalContext.Provider>
    </>
  );
}

export namespace FloatingPortal {
  export interface Props<State> extends BaseUIComponentProps<'div', State> {
    /**
     * A parent element to render the portal element into.
     */
    container?: UseFloatingPortalNodeProps['container'] | undefined;
  }
}
