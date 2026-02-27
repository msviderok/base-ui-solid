import { isWebKit } from '@base-ui/utils/detectBrowser';
import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { getNodeName, isHTMLElement } from '@floating-ui/utils/dom';
import type { FloatingTreeStore } from '@msviderok/base-ui-solid/floating-ui-solid/components/FloatingTreeStore';
import { CLICK_TRIGGER_IDENTIFIER } from '@msviderok/base-ui-solid/utils/constants';
import type { FloatingUIOpenChangeDetails } from '@msviderok/base-ui-solid/utils/types';
import { createEffect, createMemo, createSignal, on, onCleanup, Show, type JSX } from 'solid-js';
import { focusable, isTabbable, tabbable, type FocusableElement } from 'tabbable';
import { defaultProps } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { FocusGuard } from '../../utils/FocusGuard';
import { REASONS } from '../../utils/reasons';
import { useAnimationFrame } from '../../utils/useAnimationFrame';
import type { InteractionType } from '../../utils/useEnhancedClickHandler';
import { useTimeout } from '../../utils/useTimeout';
import { visuallyHidden } from '../../utils/visuallyHidden';
import type { FloatingContext, FloatingRootContext } from '../types';
import {
  activeElement,
  contains,
  getFloatingFocusElement,
  getNextTabbable,
  getNodeAncestors,
  getNodeChildren,
  getPreviousTabbable,
  getTabbableOptions,
  getTarget,
  isOutsideEvent,
  isTypeableCombobox,
  isTypeableElement,
  isVirtualClick,
  isVirtualPointerEvent,
  stopEvent,
} from '../utils';
import { createAttribute } from '../utils/createAttribute';
import { enqueueFocus } from '../utils/enqueueFocus';
import { markOthers } from '../utils/markOthers';
import { usePortalContext } from './FloatingPortal';
import { useFloatingTree } from './FloatingTree';

function getEventType(event: Event, lastInteractionType?: InteractionType): InteractionType {
  const win = ownerWindow(event.target);
  if (event instanceof win.KeyboardEvent) {
    return 'keyboard';
  }
  if (event instanceof win.FocusEvent) {
    // Focus events can be caused by a preceding pointer interaction (e.g., focusout on outside press).
    // Prefer the last known pointer type if provided, else treat as keyboard.
    return lastInteractionType || 'keyboard';
  }
  if ('pointerType' in event) {
    return ((event.pointerType as PointerEvent['pointerType']) || 'keyboard') as InteractionType;
  }
  if ('touches' in event) {
    return 'touch';
  }
  if (event instanceof win.MouseEvent) {
    // onClick events may not contain pointer events, and will fall through to here
    return lastInteractionType || (event.detail === 0 ? 'keyboard' : 'mouse');
  }
  return '';
}

const LIST_LIMIT = 20;
let previouslyFocusedElements: WeakRef<Element>[] = [];

function clearDisconnectedPreviouslyFocusedElements() {
  previouslyFocusedElements = previouslyFocusedElements.filter((entry) => {
    return entry.deref()?.isConnected;
  });
}

function addPreviouslyFocusedElement(element: Element | null) {
  clearDisconnectedPreviouslyFocusedElements();

  if (element && getNodeName(element) !== 'body') {
    previouslyFocusedElements.push(new WeakRef(element));
    if (previouslyFocusedElements.length > LIST_LIMIT) {
      previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT);
    }
  }
}

function getPreviouslyFocusedElement() {
  clearDisconnectedPreviouslyFocusedElements();
  return previouslyFocusedElements[previouslyFocusedElements.length - 1]?.deref();
}

function getFirstTabbableElement(container: Element | null) {
  if (!container) {
    return null;
  }

  const tabbableOptions = getTabbableOptions();
  if (isTabbable(container, tabbableOptions)) {
    return container;
  }

  return tabbable(container, tabbableOptions)[0] || container;
}

function isFocusable(element: Element | null) {
  if (!element || !element.isConnected) {
    return false;
  }

  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility();
  }

  return getComputedStyle(element).display !== 'none';
}

function handleTabIndex(
  floatingFocusElement: HTMLElement,
  orderRef: Array<'reference' | 'floating' | 'content'>,
) {
  if (
    !orderRef.includes('floating') &&
    !floatingFocusElement.getAttribute('role')?.includes('dialog')
  ) {
    return;
  }

  const options = getTabbableOptions();
  const focusableElements = focusable(floatingFocusElement, options);
  const tabbableContent = focusableElements.filter((element) => {
    const dataTabIndex = element.getAttribute('data-tabindex') || '';
    return (
      isTabbable(element, options) ||
      (element.hasAttribute('data-tabindex') && !dataTabIndex.startsWith('-'))
    );
  });
  const tabIndex = floatingFocusElement.getAttribute('tabindex');

  if (orderRef.includes('floating') || tabbableContent.length === 0) {
    if (tabIndex !== '0') {
      floatingFocusElement.setAttribute('tabindex', '0');
    }
  } else if (
    tabIndex !== '-1' ||
    (floatingFocusElement.hasAttribute('data-tabindex') &&
      floatingFocusElement.getAttribute('data-tabindex') !== '-1')
  ) {
    floatingFocusElement.setAttribute('tabindex', '-1');
    floatingFocusElement.setAttribute('data-tabindex', '-1');
  }
}

export interface FloatingFocusManagerProps {
  children: JSX.Element;
  /**
   * The floating context returned from `useFloatingRootContext`.
   */
  context: FloatingRootContext | FloatingContext;
  /**
   * The interaction type used to open the floating element.
   */
  openInteractionType?: (InteractionType | null) | undefined;
  /**
   * Whether or not the focus manager should be disabled. Useful to delay focus
   * management until after a transition completes or some other conditional
   * state.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * * Determines the element to focus when the floating element is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or floating element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use default behavior, `null` to fallback to default behavior,
   *   or `false`/`undefined` to do nothing.
   * @default true
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
   * Determines the element to focus when the floating element is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (reference or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fallback to default behavior,
   *   or `false`/`undefined` to do nothing.
   * @default true
   */
  returnFocus?:
    | (
        | boolean
        | HTMLElement
        | null
        | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
      )
    | undefined;
  /**
   * Determines where focus should be restored if focus inside the floating element is lost
   * (such as due to the removal of the currently focused element from the DOM).
   *
   * - `true`: restore to the nearest tabbable element inside the floating tree (previous
   *   tabbable if possible, otherwise the last tabbable, then the floating element itself)
   * - `'popup'`: restore directly to the floating element (container) itself
   * - `false`: do not restore focus
   * @default false
   */
  restoreFocus?: (boolean | 'popup') | undefined;
  /**
   * Determines if focus is “modal”, meaning focus is fully trapped inside the
   * floating element and outside content cannot be accessed. This includes
   * screen reader virtual cursors.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Determines whether `focusout` event listeners that control whether the
   * floating element should be closed if the focus moves outside of it are
   * attached to the reference and floating elements. This affects non-modal
   * focus management.
   * @default true
   */
  closeOnFocusOut?: boolean | undefined;
  /**
   * Overrides the element to focus when tabbing forward out of the floating element.
   */
  nextFocusableElement?: (HTMLElement | null) | undefined;
  /**
   * Overrides the element to focus when tabbing backward out of the floating element.
   */
  previousFocusableElement?: (HTMLElement | null) | undefined;
  /**
   * Ref to the focus guard preceding the floating element content.
   * Can be useful to focus the popup progammatically.
   */
  beforeContentFocusGuardRef?: (HTMLSpanElement | null) | undefined;
  /**
   * External FlatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 * @internal
 */
export function FloatingFocusManager(componentProps: FloatingFocusManagerProps): JSX.Element {
  const props = defaultProps(componentProps, {
    disabled: false,
    initialFocus: true,
    returnFocus: true,
    restoreFocus: false,
    modal: true,
    closeOnFocusOut: true,
    openInteractionType: '',
  });

  const store = () => {
    return 'rootStore' in props.context ? props.context.rootStore : props.context;
  };
  const open = createMemo(() => store().select('open'));
  const domReference = createMemo(() => store().select('domReferenceElement'));
  const floating = createMemo(() => store().select('floatingElement'));
  const events = createMemo(() => store().context.events);
  const dataRef = createMemo(() => store().context.dataRef);

  const getNodeId = () => store().context.dataRef.floatingContext?.nodeId();

  const ignoreInitialFocus = createMemo(() => props.initialFocus === false);
  // If the reference is a combobox and is typeable (e.g. input/textarea),
  // there are different focus semantics. The guards should not be rendered, but
  // aria-hidden should be applied to all nodes still. Further, the visually
  // hidden dismiss button should only appear at the end of the list, not the
  // start.
  const isUntrappedTypeableCombobox = createMemo(
    () => isTypeableCombobox(domReference()) && ignoreInitialFocus(),
  );

  const orderRef: Array<'reference' | 'floating' | 'content'> = ['content'];

  const tree = useFloatingTree(props.externalTree);
  const portalContext = usePortalContext();

  const [beforeGuardRef, setBeforeGuardRef] = createSignal<HTMLSpanElement>();
  const [afterGuardRef, setAfterGuardRef] = createSignal<HTMLSpanElement>();

  let preventReturnFocusRef = false;
  let isPointerDownRef = false;
  let pointerDownOutsideRef = false;
  let tabbableIndexRef = -1;
  let closeTypeRef: InteractionType = '';
  let lastInteractionTypeRef: InteractionType = '';

  const blurTimeout = useTimeout();
  const pointerDownTimeout = useTimeout();
  const restoreFocusFrame = useAnimationFrame();

  const isInsidePortal = () => floating()?.closest(`[${createAttribute('portal')}]`) != null;
  const floatingFocusElement = createMemo(() => getFloatingFocusElement(floating()));

  const getTabbableContent = (containerProp?: Element) => {
    const container = containerProp ?? floatingFocusElement();
    return container ? tabbable(container, getTabbableOptions()) : [];
  };

  const getTabbableElements = (container?: Element) => {
    const content = getTabbableContent(container);

    return orderRef
      ?.map(() => content)
      .filter(Boolean)
      .flat() as Array<FocusableElement>;
  };

  function handleFocusIn(event: FocusEvent) {
    const target = getTarget(event) as Element | null;
    const tabbableContent = getTabbableContent() as Array<Element | null>;
    const tabbableIndex = tabbableContent.indexOf(target);
    if (tabbableIndex !== -1) {
      tabbableIndexRef = tabbableIndex;
    }
  }

  // In Safari, buttons lose focus when pressing them.
  function handlePointerDown() {
    isPointerDownRef = true;
    pointerDownTimeout.start(0, () => {
      isPointerDownRef = false;
    });
  }

  function handleFocusOutside(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    const target = getTarget(event) as HTMLElement | null;
    const isModal = props.modal;
    const untrappedTypeableCombobox = isUntrappedTypeableCombobox();
    const floatingElement = floatingFocusElement();
    const doc = ownerDocument(floatingElement);
    const previouslyFocusedElement = getPreviouslyFocusedElement();
    const domReferenceValue = domReference();
    const floatingValue = floating();
    const nodeId = getNodeId();
    const portalNode = portalContext?.portalNode();
    const restoreFocusValue = props.restoreFocus;
    const tabbableContent = getTabbableContent() as Array<Element | null>;
    const triggers = store().context.triggerElements;
    const isRelatedFocusGuard =
      relatedTarget?.hasAttribute(createAttribute('focus-guard')) &&
      [
        beforeGuardRef(),
        afterGuardRef(),
        portalContext?.beforeInsideRef(),
        portalContext?.afterInsideRef(),
        portalContext?.beforeOutsideRef(),
        portalContext?.afterOutsideRef(),
        props.previousFocusableElement,
        props.nextFocusableElement,
      ].includes(relatedTarget);

    const movedToUnrelatedNode = !(
      contains(domReferenceValue, relatedTarget) ||
      contains(floatingValue, relatedTarget) ||
      contains(relatedTarget, floatingValue) ||
      contains(portalNode, relatedTarget) ||
      (relatedTarget != null && triggers.hasElement(relatedTarget)) ||
      triggers.hasMatchingElement((trigger) => contains(trigger, relatedTarget)) ||
      isRelatedFocusGuard ||
      (tree &&
        (getNodeChildren(tree.nodesRef, nodeId).find(
          (node) =>
            contains(node.context?.elements.floating(), relatedTarget) ||
            contains(node.context?.elements.domReference(), relatedTarget),
        ) ||
          getNodeAncestors(tree.nodesRef, nodeId).find(
            (node) =>
              [
                node.context?.elements.floating(),
                getFloatingFocusElement(node.context?.elements.floating() ?? null),
              ].includes(relatedTarget) || node.context?.elements.domReference() === relatedTarget,
          )))
    );

    // eslint-disable-next-line solid/reactivity
    queueMicrotask(() => {
      if (currentTarget === domReferenceValue && floatingElement) {
        handleTabIndex(floatingElement, orderRef);
      }

      // // Restore focus to the previous tabbable element index to prevent
      // // focus from being lost outside the floating tree.
      if (
        restoreFocusValue &&
        currentTarget !== domReferenceValue &&
        !isFocusable(target) &&
        activeElement(doc) === doc.body
      ) {
        // Let `FloatingPortal` effect knows that focus is still inside the
        // floating tree.
        if (isHTMLElement(floatingElement)) {
          floatingElement.focus();
          // If explicitly requested to restore focus to the popup container, do not search
          // for the next/previous tabbable element.
          if (restoreFocusValue === 'popup') {
            // If the element is removed on pointerdown, focus tries to move it,
            // but since it's removed at the same time, focus gets lost as it
            // happens after the .focus() call above.
            // In this case, focus needs to be moved asynchronously.
            restoreFocusFrame.request(() => {
              floatingElement?.focus();
            });
            return;
          }
        }

        const prevTabbableIndex = tabbableIndexRef;

        const nodeToFocus =
          tabbableContent[prevTabbableIndex] ||
          tabbableContent[tabbableContent.length - 1] ||
          floatingElement;

        if (isHTMLElement(nodeToFocus)) {
          nodeToFocus.focus();
        }
      }

      if (store().context.dataRef.insidePortal) {
        store().context.dataRef.insidePortal = false;
        return;
      }

      // Focus did not move inside the floating tree, and there are no tabbable
      // portal guards to handle closing.
      if (
        (untrappedTypeableCombobox ? true : !isModal) &&
        relatedTarget &&
        movedToUnrelatedNode &&
        !isPointerDownRef &&
        // Fix React 18 Strict Mode returnFocus due to double rendering.
        // For an "untrapped" typeable combobox (input role=combobox with
        // initialFocus=false), re-opening the popup and tabbing out should still close it even
        // when the previously focused element (e.g. the next tabbable outside the popup) is
        // focused again. Otherwise, the popup remains open on the second Tab sequence:
        // click input -> Tab (closes) -> click input -> Tab.
        // Allow closing when `isUntrappedTypeableCombobox` regardless of the previously focused element.
        (isUntrappedTypeableCombobox() || relatedTarget !== previouslyFocusedElement)
      ) {
        preventReturnFocusRef = true;
        store().setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
      }
    });
  }

  // Dismissing via outside press should always ignore `returnFocus` to
  // prevent unwanted scrolling.
  function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
    if (!details.open) {
      closeTypeRef = getEventType(details.nativeEvent, lastInteractionTypeRef);
    }

    if (details.reason === REASONS.triggerHover && details.nativeEvent.type === 'mouseleave') {
      preventReturnFocusRef = true;
    }

    if (details.reason !== REASONS.outsidePress) {
      return;
    }

    if (details.nested) {
      preventReturnFocusRef = false;
    } else if (
      isVirtualClick(details.nativeEvent as MouseEvent) ||
      isVirtualPointerEvent(details.nativeEvent as PointerEvent)
    ) {
      preventReturnFocusRef = false;
    } else {
      let isPreventScrollSupported = false;
      document.createElement('div').focus({
        get preventScroll() {
          isPreventScrollSupported = true;
          return false;
        },
      });

      if (isPreventScrollSupported) {
        preventReturnFocusRef = false;
      } else {
        preventReturnFocusRef = true;
      }
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      // The focus guards have nothing to focus, so we need to stop the event.
      const floatingElement = floatingFocusElement();
      if (
        contains(floatingElement, activeElement(ownerDocument(floatingElement))) &&
        getTabbableContent().length === 0 &&
        !isUntrappedTypeableCombobox()
      ) {
        stopEvent(event);
      }
    }
  }

  function markinsidePortal() {
    if (pointerDownOutsideRef) {
      return;
    }

    dataRef().insidePortal = true;
    const fn = () => {
      dataRef().insidePortal = false;
    };
    blurTimeout.start(0, fn);
  }

  createEffect(() => {
    if (props.disabled || !props.modal) {
      return;
    }

    const doc = ownerDocument(floatingFocusElement());
    doc.addEventListener('keydown', onKeyDown);
    onCleanup(() => {
      doc.removeEventListener('keydown', onKeyDown);
    });
  });

  // Track the last interaction type at the document level to disambiguate focus events
  createEffect(() => {
    if (props.disabled || !open()) {
      return;
    }

    const doc = ownerDocument(floatingFocusElement());

    function clearPointerDownOutside() {
      pointerDownOutsideRef = false;
    }

    function onPointerDown(event: PointerEvent) {
      const target = getTarget(event) as Element | null;
      const pointerTargetInside =
        contains(floating(), target) ||
        contains(domReference(), target) ||
        contains(portalContext?.portalNode(), target);
      pointerDownOutsideRef = !pointerTargetInside;
      lastInteractionTypeRef = (event.pointerType as InteractionType) || 'keyboard';

      if (target?.closest(`[${CLICK_TRIGGER_IDENTIFIER}]`)) {
        isPointerDownRef = true;
      }
    }

    function _onKeyDown() {
      lastInteractionTypeRef = 'keyboard';
    }

    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('pointerup', clearPointerDownOutside, true);
    doc.addEventListener('pointercancel', clearPointerDownOutside, true);
    doc.addEventListener('keydown', _onKeyDown, true);
    onCleanup(() => {
      doc.removeEventListener('pointerdown', onPointerDown, true);
      doc.removeEventListener('pointerup', clearPointerDownOutside, true);
      doc.removeEventListener('pointercancel', clearPointerDownOutside, true);
      doc.removeEventListener('keydown', _onKeyDown, true);
    });
  });

  createEffect(() => {
    if (props.disabled || !props.closeOnFocusOut) {
      return;
    }

    const floatingEl = floating();
    const domReferenceValue = domReference();
    const domReferenceElement = isHTMLElement(domReferenceValue) ? domReferenceValue : null;

    if (!floatingEl && !domReferenceElement) {
      return;
    }

    if (domReferenceElement) {
      domReferenceElement.addEventListener('focusout', handleFocusOutside);
      domReferenceElement.addEventListener('pointerdown', handlePointerDown);
      onCleanup(() => {
        domReferenceElement.removeEventListener('focusout', handleFocusOutside);
        domReferenceElement.removeEventListener('pointerdown', handlePointerDown);
      });
    }

    if (floatingEl) {
      floatingEl.addEventListener('focusin', handleFocusIn);
      floatingEl.addEventListener('focusout', handleFocusOutside);
      onCleanup(() => {
        floatingEl.removeEventListener('focusin', handleFocusIn);
        floatingEl.removeEventListener('focusout', handleFocusOutside);
      });

      if (portalContext) {
        floatingEl.addEventListener('focusout', markinsidePortal, true);
        onCleanup(() => floatingEl.removeEventListener('focusout', markinsidePortal, true));
      }
    }
  });

  // Focus the initial element when the floating element opens.
  createEffect(
    on(
      [
        () => props.disabled,
        open,
        floatingFocusElement,
        ignoreInitialFocus,
        () => props.initialFocus,
        () => props.openInteractionType,
      ],
      () => {
        const floatingEl = floatingFocusElement();
        if (!open() || props.disabled || !isHTMLElement(floatingEl)) {
          return;
        }

        const doc = ownerDocument(floatingEl);
        const previouslyFocusedElement = activeElement(doc);

        // Wait for any layout effect state setters to execute to set `tabIndex`.
        // eslint-disable-next-line solid/reactivity
        queueMicrotask(() => {
          const focusableElements = getTabbableElements(floatingEl);
          const resolvedInitialFocus =
            typeof props.initialFocus === 'function'
              ? props.initialFocus(props.openInteractionType || '')
              : props.initialFocus;

          // `null` should fallback to default behavior in case of an empty ref.
          // `false`/`undefined` (void) means do nothing.
          if (resolvedInitialFocus === false || resolvedInitialFocus === undefined) {
            return;
          }

          let elToFocus: FocusableElement | null | undefined;

          if (resolvedInitialFocus === true || resolvedInitialFocus === null) {
            elToFocus = focusableElements[0] || floatingEl;
          } else {
            elToFocus = resolvedInitialFocus;
          }
          elToFocus = elToFocus || focusableElements[0] || floatingEl;

          const focusAlreadyInsideFloatingEl =
            contains(floatingEl, previouslyFocusedElement) ||
            contains(floatingEl, activeElement(doc));

          if (focusAlreadyInsideFloatingEl) {
            return;
          }

          enqueueFocus(elToFocus, {
            preventScroll: elToFocus === floatingEl,
          });
        });
      },
    ),
  );

  const insideElements = createMemo(() => {
    // Don't hide portals nested within the parent portal.
    const portalNodes = Array.from(
      portalContext?.portalNode()?.querySelectorAll(`[${createAttribute('portal')}]`) || [],
    );
    const ancestors = tree ? getNodeAncestors(tree.nodesRef, getNodeId()) : [];
    const rootAncestorCombobox = ancestors.find((node) =>
      isTypeableCombobox(node.context?.elements.domReference() ?? null),
    );
    const rootAncestorComboboxDomReference = rootAncestorCombobox
      ? rootAncestorCombobox.context?.elements.domReference()
      : null;

    return [
      floating(),
      rootAncestorComboboxDomReference,
      ...portalNodes,
      beforeGuardRef(),
      afterGuardRef(),
      portalContext?.beforeOutsideRef() ?? null,
      portalContext?.afterOutsideRef() ?? null,
      props.previousFocusableElement,
      props.nextFocusableElement,
      isUntrappedTypeableCombobox() ? domReference() : null,
    ].filter((x): x is Element => x != null);
  });

  // Hide everything outside the floating tree from assistive tech while open.
  createEffect(() => {
    if (props.disabled || !floating() || !open()) {
      return;
    }

    const cleanup = markOthers(insideElements(), props.modal || isUntrappedTypeableCombobox());
    onCleanup(() => cleanup());
  });

  createEffect(() => {
    const floatingEl = floatingFocusElement();
    if (props.disabled || !floatingEl) {
      return;
    }

    const doc = ownerDocument(floatingEl);
    const previouslyFocusedElement = activeElement(doc);

    addPreviouslyFocusedElement(previouslyFocusedElement);

    events().on('openchange', onOpenChangeLocal);

    const domReferenceEl = domReference();

    const fallbackEl = doc.createElement('span');
    fallbackEl.setAttribute('tabindex', '-1');
    fallbackEl.setAttribute('aria-hidden', 'true');
    Object.assign(fallbackEl.style, visuallyHidden);

    if (isInsidePortal() && domReferenceEl) {
      domReferenceEl.insertAdjacentElement('afterend', fallbackEl);
    }

    function getReturnElement() {
      let resolvedReturnFocusValue =
        typeof props.returnFocus === 'function'
          ? props.returnFocus(closeTypeRef)
          : props.returnFocus;

      // `null` should fallback to default behavior in case of an empty ref.
      if (resolvedReturnFocusValue === undefined || resolvedReturnFocusValue === false) {
        return null;
      }

      if (resolvedReturnFocusValue === null) {
        resolvedReturnFocusValue = true;
      }

      if (typeof resolvedReturnFocusValue === 'boolean') {
        const el = domReferenceEl || getPreviouslyFocusedElement();
        return el && el.isConnected ? el : fallbackEl;
      }

      const fallback = domReferenceEl || getPreviouslyFocusedElement() || fallbackEl;

      return resolvedReturnFocusValue || fallback;
    }

    onCleanup(() => {
      events().off('openchange', onOpenChangeLocal);

      const activeEl = activeElement(doc);
      const floatingEl = floating();

      const isFocusInsideFloatingTree =
        contains(floatingEl, activeEl) ||
        (tree &&
          getNodeChildren(tree.nodesRef, getNodeId(), false).some((node) =>
            contains(node.context?.elements.floating(), activeEl),
          ));

      const returnElement = getReturnElement();
      // This is `returnElement`, if it's tabbable, or its first tabbable child.
      const tabbableReturnElement = getFirstTabbableElement(returnElement);
      const returnFocusValue = props.returnFocus;
      const hasExplicitReturnFocus = typeof props.returnFocus !== 'boolean';

      queueMicrotask(() => {
        if (
          returnFocusValue &&
          !preventReturnFocusRef &&
          isHTMLElement(tabbableReturnElement) &&
          // If the focus moved somewhere else after mount, avoid returning focus
          // since it likely entered a different element which should be
          // respected: https://github.com/floating-ui/floating-ui/issues/2607
          (!hasExplicitReturnFocus && tabbableReturnElement !== activeEl && activeEl !== doc.body
            ? isFocusInsideFloatingTree
            : true)
        ) {
          tabbableReturnElement.focus({ preventScroll: true });
        }

        fallbackEl.remove();
        preventReturnFocusRef = false;
      });
    });
  });

  // Safari may randomly scroll to the bottom of the page if an input inside a popup has focus
  // when the popup unmounts from the DOM.
  // By blurring it before the popup unmounts, we can prevent this behavior.
  createEffect(() => {
    if (!isWebKit || open() || !floating()) {
      return;
    }

    const floatingEl = floating() ?? null;
    const activeEl = activeElement(ownerDocument(floatingEl));
    if (!isHTMLElement(activeEl) || !isTypeableElement(activeEl)) {
      return;
    }
    if (contains(floatingEl, activeEl)) {
      activeEl.blur();
    }
  });

  // Synchronize the `context` & `modal` value to the FloatingPortal context.
  // It will decide whether or not it needs to render its own guards.
  createEffect(() => {
    if (props.disabled || !portalContext) {
      return;
    }

    portalContext.setFocusManagerState({
      modal: props.modal,
      closeOnFocusOut: props.closeOnFocusOut,
      open: open(),
      onOpenChange: store().setOpen,
      domReference: domReference(),
    });

    onCleanup(() => portalContext.setFocusManagerState(null));
  });

  // Keep the floating element tabIndex in sync and clear stale focus records.
  createEffect(() => {
    const floatingEl = floatingFocusElement();
    if (props.disabled || !floatingEl) {
      return;
    }

    handleTabIndex(floatingEl, orderRef);
    onCleanup(() => queueMicrotask(clearDisconnectedPreviouslyFocusedElements));
  });

  const shouldRenderGuards = createMemo(
    () =>
      !props.disabled &&
      (props.modal ? !isUntrappedTypeableCombobox() : true) &&
      (isInsidePortal() || props.modal),
  );

  return (
    <>
      <Show when={shouldRenderGuards()}>
        <FocusGuard
          data-type="inside"
          ref={(el) => {
            setBeforeGuardRef(el);
            props.beforeContentFocusGuardRef = el;
            portalContext?.setBeforeInsideRef(el);
          }}
          onFocus={(event) => {
            if (props.modal) {
              const els = getTabbableElements();
              enqueueFocus(els[els.length - 1]);
            } else if (portalContext?.portalNode()) {
              preventReturnFocusRef = false;
              if (isOutsideEvent(event, portalContext.portalNode()!)) {
                const nextTabbable = getNextTabbable(domReference());
                nextTabbable?.focus();
              } else {
                (props.previousFocusableElement ?? portalContext.beforeOutsideRef())?.focus();
              }
            }
          }}
        />
      </Show>
      {props.children}
      <Show when={shouldRenderGuards()}>
        <FocusGuard
          data-type="inside"
          ref={(el) => {
            setAfterGuardRef(el);
            portalContext?.setAfterInsideRef(el);
          }}
          onFocus={(event) => {
            if (props.modal) {
              enqueueFocus(getTabbableElements()[0]);
            } else if (portalContext?.portalNode()) {
              if (props.closeOnFocusOut) {
                preventReturnFocusRef = true;
              }

              if (isOutsideEvent(event, portalContext.portalNode()!)) {
                const prevTabbable = getPreviousTabbable(domReference());
                prevTabbable?.focus();
              } else {
                (props.nextFocusableElement ?? portalContext.afterOutsideRef())?.focus();
              }
            }
          }}
        />
      </Show>
    </>
  );
}
