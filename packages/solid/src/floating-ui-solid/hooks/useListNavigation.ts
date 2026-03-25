import { ownerDocument } from '@base-ui/utils/owner';
import { isHTMLElement } from '@floating-ui/utils/dom';
import {
  createEffect,
  createMemo,
  createRenderEffect,
  mergeProps as solidMergeProps,
  untrack,
  type JSX,
} from 'solid-js';
import { access, defaultProps, useRef } from '../../solid-helpers';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import {
  activeElement,
  contains,
  createGridCellMap,
  findNonDisabledListIndex,
  getFloatingFocusElement,
  getGridCellIndexOfCorner,
  getGridCellIndices,
  getGridNavigatedIndex,
  getMaxListIndex,
  getMinListIndex,
  getTarget,
  isIndexOutOfListBounds,
  isListIndexDisabled,
  isTypeableCombobox,
  isVirtualClick,
  isVirtualPointerEvent,
  stopEvent,
} from '../utils';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from '../utils/constants';
import { enqueueFocus } from '../utils/enqueueFocus';

export const ESCAPE = 'Escape';

function doSwitch(
  orientation: UseListNavigationProps['orientation'],
  vertical: boolean,
  horizontal: boolean,
) {
  switch (orientation) {
    case 'vertical':
      return vertical;
    case 'horizontal':
      return horizontal;
    default:
      return vertical || horizontal;
  }
}

function isMainOrientationKey(key: string, orientation: UseListNavigationProps['orientation']) {
  const vertical = key === ARROW_UP || key === ARROW_DOWN;
  const horizontal = key === ARROW_LEFT || key === ARROW_RIGHT;
  return doSwitch(orientation, vertical, horizontal);
}

function isMainOrientationToEndKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = key === ARROW_DOWN;
  const horizontal = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  return (
    doSwitch(orientation, vertical, horizontal) || key === 'Enter' || key === ' ' || key === ''
  );
}

function isCrossOrientationOpenKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
) {
  const vertical = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  const horizontal = key === ARROW_DOWN;
  return doSwitch(orientation, vertical, horizontal);
}

function isCrossOrientationCloseKey(
  key: string,
  orientation: UseListNavigationProps['orientation'],
  rtl: boolean,
  cols?: number,
) {
  const vertical = rtl ? key === ARROW_RIGHT : key === ARROW_LEFT;
  const horizontal = key === ARROW_UP;
  if (orientation === 'both' || (orientation === 'horizontal' && cols && cols > 1)) {
    return key === ESCAPE;
  }
  return doSwitch(orientation, vertical, horizontal);
}

export interface UseListNavigationProps {
  /**
   * A ref that holds an array of list items.
   * @default empty list
   */
  listRef: Array<HTMLElement | null | undefined>;
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: number | null;
  /**
   * A callback that is called when the user navigates to a new active item,
   * passed in a new `activeIndex`.
   */
  onNavigate?: ((activeIndex: number | null, event: Event | undefined) => void) | undefined;
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The currently selected item index, which may or may not be active.
   * @default null
   */
  selectedIndex?: (number | null) | undefined;
  /**
   * Whether to focus the item upon opening the floating element. 'auto' infers
   * what to do based on the input type (keyboard vs. pointer), while a boolean
   * value will force the value.
   * @default 'auto'
   */
  focusItemOnOpen?: (boolean | 'auto') | undefined;
  /**
   * Whether hovering an item synchronizes the focus.
   * @default true
   */
  focusItemOnHover?: boolean | undefined;
  /**
   * Whether pressing an arrow key on the navigation’s main axis opens the
   * floating element.
   * @default true
   */
  openOnArrowKeyDown?: boolean | undefined;
  /**
   * By default elements with either a `disabled` or `aria-disabled` attribute
   * are skipped in the list navigation — however, this requires the items to
   * be rendered.
   * This prop allows you to manually specify indices which should be disabled,
   * overriding the default logic.
   * For Windows-style select popups, where the menu does not open when
   * navigating via arrow keys, specify an empty array.
   * @default undefined
   */
  disabledIndices?:
    | ReadonlyArray<number>
    | ((index?: number) => boolean | ReadonlyArray<number>)
    | undefined;
  /**
   * Determines whether focus can escape the list, such that nothing is selected
   * after navigating beyond the boundary of the list. In some
   * autocomplete/combobox components, this may be desired, as screen
   * readers will return to the input.
   * `loop` must be `true`.
   * @default false
   */
  allowEscape?: boolean | undefined;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   * @default false
   */
  loopFocus?: boolean | undefined;
  /**
   * If the list is nested within another one (e.g. a nested submenu), the
   * navigation semantics change.
   * @default false
   */
  nested?: boolean | undefined;
  /**
   * Allows to specify the orientation of the parent list, which is used to
   * determine the direction of the navigation.
   * This is useful when list navigation is used within a Composite,
   * as the hook can't determine the orientation of the parent list automatically.
   */
  parentOrientation?: UseListNavigationProps['orientation'] | undefined;
  /**
   * Whether the direction of the floating element’s navigation is in RTL
   * layout.
   * @default false
   */
  rtl?: boolean | undefined;
  /**
   * Whether the focus is virtual (using `aria-activedescendant`).
   * Use this if you need focus to remain on the reference element
   * (such as an input), but allow arrow keys to navigate list items.
   * This is common in autocomplete listbox components.
   * Your virtually-focused list items must have a unique `id` set on them.
   * If you’re using a component role with the `useRole()` Hook, then an `id` is
   * generated automatically.
   * @default false
   */
  virtual?: boolean | undefined;
  /**
   * The orientation in which navigation occurs.
   * @default 'vertical'
   */
  orientation?: ('vertical' | 'horizontal' | 'both') | undefined;
  /**
   * Specifies how many columns the list has (i.e., it’s a grid). Use an
   * orientation of 'horizontal' (e.g. for an emoji picker/date picker, where
   * pressing ArrowRight or ArrowLeft can change rows), or 'both' (where the
   * current row cannot be escaped with ArrowRight or ArrowLeft, only ArrowUp
   * and ArrowDown).
   * @default 1
   */
  cols?: number | undefined;
  /**
   * The id of the root component.
   */
  id?: string | undefined;
  /**
   * Whether to clear the active index when the pointer leaves an item.
   * @default true
   */
  resetOnPointerLeave?: boolean | undefined;
  /**
   * External FlatingTree to use when the one provided by context can't be used.
   */
  externalTree?: FloatingTreeStore | undefined;
}

/**
 * Adds arrow key-based navigation of a list of items, either using real DOM
 * focus or virtual focus.
 * @see https://floating-ui.com/docs/useListNavigation
 */
export function useListNavigation(parameters: {
  context: FloatingRootContext | FloatingContext;
  props: UseListNavigationProps;
}): ElementProps {
  const store = () =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context;
  const open = createMemo(() => store().select('open'));
  const floatingElement = createMemo(() => store().select('floatingElement'));
  const domReferenceElement = createMemo(() => store().select('domReferenceElement'));
  const dataRef = () => store().context.dataRef;

  const props = defaultProps(parameters.props, {
    enabled: true,
    selectedIndex: null,
    allowEscape: false,
    loopFocus: false,
    nested: false,
    rtl: false,
    virtual: false,
    focusItemOnOpen: 'auto',
    focusItemOnHover: true,
    openOnArrowKeyDown: true,
    disabledIndices: undefined,
    orientation: 'vertical',
    cols: 1,
    resetOnPointerLeave: true,
  });
  const activeIndex = () => parameters.props.activeIndex;
  const hasMountedList = () => props.listRef.some((item) => item != null);

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (props.allowEscape) {
        if (!props.loopFocus) {
          console.warn('`useListNavigation` looping must be enabled to allow escaping.');
        }

        if (!props.virtual) {
          console.warn('`useListNavigation` must be virtual to allow escaping.');
        }
      }

      if (props.orientation === 'vertical' && props.cols > 1) {
        console.warn(
          'In grid list navigation mode (`cols` > 1), the `orientation` should',
          'be either "horizontal" or "both".',
        );
      }
    });
  }

  const floatingFocusElement = () => getFloatingFocusElement(floatingElement());
  const floatingFocusElementRef = useRef<HTMLElement | null>(floatingFocusElement());

  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree(props.externalTree);

  createRenderEffect(() => {
    dataRef().orientation = props.orientation;
  });

  /**
   * TODO: this needs to be memoized as it causes an infinite loop
   * with the MenuRoot triggerElement assignement
   */
  const typeableComboboxReference = createMemo(() => isTypeableCombobox(domReferenceElement()));

  const focusItemOnOpenRef = useRef(props.focusItemOnOpen);
  const indexRef = useRef(props.selectedIndex ?? -1);
  const keyRef = useRef<null | string>(null);
  const isPointerModalityRef = useRef(true);

  const onNavigate = (event?: Event) => {
    props.onNavigate?.(indexRef.current === -1 ? null : indexRef.current, event);
  };

  const forceSyncFocusRef = useRef(false);
  const isMounted = () => !!floatingElement() || hasMountedList();
  const forceScrollIntoViewRef = useRef(false);
  const previousMountedRef = useRef(false);
  const previousOpenRef = useRef(false);
  const previousOnNavigateRef = useRef(onNavigate);
  const disabledIndicesRef = useRef(props.disabledIndices);
  const selectedIndexRef = useRef(props.selectedIndex);
  const resetOnPointerLeaveRef = useRef(props.resetOnPointerLeave);

  function runFocus(item: HTMLElement) {
    if (props.virtual) {
      tree?.events.emit('virtualfocus', item);
    } else {
      enqueueFocus(item, {
        sync: forceSyncFocusRef.current,
        preventScroll: true,
      });
    }
  }

  const focusItem = () => {
    const initialItem = props.listRef[indexRef.current];
    const forceScrollIntoView = forceScrollIntoViewRef.current;
    if (initialItem) {
      runFocus(initialItem);
    }

    const scheduler = forceSyncFocusRef.current ? (v: () => void) => v() : requestAnimationFrame;

    scheduler(() => {
      const waitedItem = props.listRef[indexRef.current] || initialItem;

      if (!waitedItem) {
        return;
      }

      if (!initialItem) {
        runFocus(waitedItem);
      }

      const shouldScrollIntoView =
        waitedItem && (forceScrollIntoView || !isPointerModalityRef.current);

      if (shouldScrollIntoView) {
        // JSDOM doesn't support `.scrollIntoView()` but it's widely supported
        // by all browsers.
        waitedItem.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    });
  };

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  createRenderEffect(() => {
    if (!props.enabled) {
      return;
    }

    if (open() && isMounted()) {
      if (untrack(() => activeIndex()) != null) {
        return;
      }

      const selected = props.selectedIndex;
      indexRef.current = selected ?? -1;
      if (focusItemOnOpenRef.current && selected != null) {
        // Regardless of the pointer modality, we want to ensure the selected
        // item comes into view when the floating element is opened.
        forceScrollIntoViewRef.current = true;
        onNavigate();
      }
    } else if (previousMountedRef.current) {
      indexRef.current = -1;
      previousOnNavigateRef.current();
    }
  });

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  createRenderEffect(() => {
    if (!props.enabled) {
      return;
    }

    if (!open()) {
      forceSyncFocusRef.current = false;
      return;
    }

    if (!isMounted()) {
      return;
    }

    const idx = activeIndex();
    if (idx == null) {
      forceSyncFocusRef.current = false;

      if (selectedIndexRef.current != null) {
        return;
      }

      // Reset while the floating element was open (e.g. the list changed).
      if (previousMountedRef.current) {
        indexRef.current = -1;
        focusItem();
      }

      // Initial sync.
      if (
        (!previousOpenRef.current || !previousMountedRef.current) &&
        focusItemOnOpenRef.current &&
        (keyRef.current != null || (focusItemOnOpenRef.current === true && keyRef.current == null))
      ) {
        let runs = 0;
        const maxRuns = 10;
        const orientationResolved = props.orientation;
        const rtlResolved = props.rtl;
        const nestedResolved = props.nested;
        const waitForListPopulated = () => {
          if (props.listRef[0] == null) {
            // Avoid letting the browser paint if possible on the first try,
            // otherwise use rAF.
            if (runs < maxRuns) {
              const scheduler = runs ? requestAnimationFrame : queueMicrotask;
              scheduler(waitForListPopulated);
            }
            runs += 1;
          } else {
            // Keep initial keyboard-open focus in the same task.
            forceSyncFocusRef.current = true;
            // initially focus the first non-disabled item
            indexRef.current =
              keyRef.current == null ||
              isMainOrientationToEndKey(keyRef.current, orientationResolved, rtlResolved) ||
              nestedResolved
                ? getMinListIndex(props.listRef)
                : getMaxListIndex(props.listRef);
            keyRef.current = null;
            onNavigate();
          }
        };

        waitForListPopulated();
      }
    } else if (!isIndexOutOfListBounds(props.listRef, idx)) {
      indexRef.current = idx;
      focusItem();
      forceScrollIntoViewRef.current = false;
    }
  });

  // Ensure the parent floating element has focus when a nested child closes
  // to allow arrow key navigation to work after the pointer leaves the child.
  createEffect(() => {
    if (
      !props.enabled ||
      open() ||
      isMounted() ||
      !tree ||
      props.virtual ||
      !previousMountedRef.current
    ) {
      return;
    }

    const nodes = tree.nodesRef;
    const parentNode = nodes.find((node) => node.id === parentId);
    const parent = parentNode ? access(parentNode.context)?.elements.floating() : undefined;
    const activeEl = activeElement(ownerDocument(floatingElement() ?? null));
    const treeContainsActiveEl = nodes.some(
      (node) => node.context && contains(node.context.elements.floating(), activeEl),
    );

    if (parent && !treeContainsActiveEl && isPointerModalityRef.current) {
      parent.focus({ preventScroll: true });
    }
  });

  createEffect(() => {
    floatingFocusElementRef.current = floatingFocusElement();
    previousOnNavigateRef.current = onNavigate;
    previousOpenRef.current = open();
    previousMountedRef.current = isMounted();
    disabledIndicesRef.current = props.disabledIndices;
    selectedIndexRef.current = props.selectedIndex;
    resetOnPointerLeaveRef.current = props.resetOnPointerLeave;
  });

  createEffect(() => {
    if (!open()) {
      keyRef.current = null;
      focusItemOnOpenRef.current = props.focusItemOnOpen;
    }
  });

  const hasActiveIndex = () => activeIndex() != null;

  function syncCurrentTarget(event: Event) {
    if (!open()) {
      return;
    }
    const index = props.listRef.indexOf(event.currentTarget as HTMLElement);
    if (index !== -1 && indexRef.current !== index) {
      indexRef.current = index;
      onNavigate(event);
    }
  }

  const item: ElementProps['item'] = {
    onFocus(event) {
      forceSyncFocusRef.current = true;
      syncCurrentTarget(event);
    },
    onClick: ({ currentTarget }) => currentTarget.focus({ preventScroll: true }), // Safari
    onMouseMove(event) {
      forceSyncFocusRef.current = true;
      forceScrollIntoViewRef.current = false;
      if (props.focusItemOnHover) {
        syncCurrentTarget(event);
      }
    },
    onPointerLeave(event) {
      if (!open() || !isPointerModalityRef.current || event.pointerType === 'touch') {
        return;
      }

      forceSyncFocusRef.current = true;

      const relatedTarget = event.relatedTarget as HTMLElement | null;

      if (!props.focusItemOnHover || props.listRef.includes(relatedTarget)) {
        return;
      }

      if (!resetOnPointerLeaveRef.current) {
        return;
      }

      enqueueFocus(null, { sync: true });
      indexRef.current = -1;
      onNavigate(event);

      if (!props.virtual) {
        floatingFocusElementRef.current?.focus({ preventScroll: true });
      }
    },
  };

  const getParentOrientation = () => {
    if (props.parentOrientation) {
      return props.parentOrientation;
    }

    const parentNode = tree?.nodesRef?.find((node) => node.id === parentId);
    return (
      (parentNode ? access(parentNode.context)?.dataRef?.orientation : undefined) ??
      props.orientation
    );
  };

  const commonOnKeyDown = (event: KeyboardEvent) => {
    isPointerModalityRef.current = false;
    forceSyncFocusRef.current = true;
    const floatingEl = floatingElement();

    // When composing a character, Chrome fires ArrowDown twice. Firefox/Safari
    // don't appear to suffer from this. `event.isComposing` is avoided due to
    // Safari not supporting it properly (although it's not needed in the first
    // place for Safari, just avoiding any possible issues).
    if (event.which === 229) {
      return;
    }

    // If the floating element is animating out, ignore navigation. Otherwise,
    // the `activeIndex` gets set to 0 despite not being open so the next time
    // the user ArrowDowns, the first item won't be focused.
    if (!open() && event.currentTarget === floatingEl && !dataRef().__closing) {
      return;
    }

    if (
      props.nested &&
      isCrossOrientationCloseKey(event.key, props.orientation, props.rtl, props.cols)
    ) {
      // If the nested list's close key is also the parent navigation key,
      // let the parent navigate. Otherwise, stop propagating the event.
      if (!isMainOrientationKey(event.key, getParentOrientation())) {
        stopEvent(event);

        if (dataRef().__closing) {
          event.stopImmediatePropagation();
          delete dataRef().__closing;
        }
      }

      queueMicrotask(() => {
        store().setOpen(false, createChangeEventDetails(REASONS.listNavigation, event));
      });

      const domReference = domReferenceElement();
      if (isHTMLElement(domReference)) {
        if (props.virtual) {
          tree?.events.emit('virtualfocus', domReference);
        } else {
          domReference.focus();
        }
      }

      return;
    }

    const currentIndex = indexRef.current;
    const minIndex = getMinListIndex(props.listRef, disabledIndicesRef.current);
    const maxIndex = getMaxListIndex(props.listRef, disabledIndicesRef.current);

    if (!typeableComboboxReference()) {
      if (event.key === 'Home') {
        stopEvent(event);
        indexRef.current = minIndex;
        onNavigate(event);
        if (!props.virtual) {
          focusItem();
        }
      }

      if (event.key === 'End') {
        stopEvent(event);
        indexRef.current = maxIndex;
        onNavigate(event);
        if (!props.virtual) {
          focusItem();
        }
      }
    }

    // Grid navigation.
    if (props.cols > 1) {
      const sizes = Array.from({ length: props.listRef.length }, () => ({
        width: 1,
        height: 1,
      }));
      // To calculate movements on the grid, we use hypothetical cell indices
      // as if every item was 1x1, then convert back to real indices.

      const cellMap = createGridCellMap(sizes, props.cols, false);
      const minGridIndex = cellMap.findIndex(
        (index) =>
          index != null && !isListIndexDisabled(props.listRef, index, disabledIndicesRef.current),
      );
      // last enabled index
      const maxGridIndex = cellMap.reduce(
        (foundIndex: number, index, cellIndex) =>
          index != null && !isListIndexDisabled(props.listRef, index, disabledIndicesRef.current)
            ? cellIndex
            : foundIndex,
        -1,
      );

      const navigatedIndex = getGridNavigatedIndex(
        cellMap.map((itemIndex) => (itemIndex != null ? props.listRef[itemIndex] : null)),
        {
          event,
          orientation: props.orientation,
          loopFocus: props.loopFocus,
          rtl: props.rtl,
          cols: props.cols,
          // treat undefined (empty grid spaces) as disabled indices so we
          // don't end up in them
          disabledIndices: getGridCellIndices(
            [
              ...((typeof props.disabledIndices !== 'function' ? props.disabledIndices : null) ||
                props.listRef.map((_, listIndex) =>
                  isListIndexDisabled(props.listRef, listIndex, disabledIndicesRef.current)
                    ? listIndex
                    : undefined,
                )),
              undefined,
            ],
            cellMap,
          ),
          minIndex: minGridIndex,
          maxIndex: maxGridIndex,
          prevIndex: getGridCellIndexOfCorner(
            indexRef.current > maxIndex ? minIndex : indexRef.current,
            sizes,
            cellMap,
            props.cols,
            // use a corner matching the edge closest to the direction
            // we're moving in so we don't end up in the same item. Prefer
            // top/left over bottom/right.
            // eslint-disable-next-line no-nested-ternary
            event.key === ARROW_DOWN
              ? 'bl'
              : event.key === (props.rtl ? ARROW_LEFT : ARROW_RIGHT)
                ? 'tr'
                : 'tl',
          ),
          stopEvent: true,
        },
      );

      const index = cellMap[navigatedIndex];

      if (index != null) {
        indexRef.current = index;
        onNavigate(event);
      }

      if (props.orientation === 'both') {
        return;
      }
    }

    if (isMainOrientationKey(event.key, props.orientation)) {
      stopEvent(event);

      // Reset the index if no item is focused.
      if (
        open() &&
        !props.virtual &&
        event.currentTarget === floatingEl &&
        activeElement((event.currentTarget as any)?.ownerDocument) === event.currentTarget
      ) {
        const newIndex = isMainOrientationToEndKey(event.key, props.orientation, props.rtl)
          ? minIndex
          : maxIndex;
        indexRef.current = newIndex;

        onNavigate(event);
        return;
      }

      if (isMainOrientationToEndKey(event.key, props.orientation, props.rtl)) {
        if (props.loopFocus) {
          if (currentIndex >= maxIndex) {
            if (props.allowEscape && currentIndex !== props.listRef.length) {
              indexRef.current = -1;
            } else {
              // Give time for virtualizers to update the listRef.
              forceSyncFocusRef.current = false;
              indexRef.current = minIndex;
            }
          } else {
            indexRef.current = findNonDisabledListIndex(props.listRef, {
              startingIndex: currentIndex,
              disabledIndices: disabledIndicesRef.current,
            });
          }
        } else {
          const newIndex = Math.min(
            maxIndex,
            findNonDisabledListIndex(props.listRef, {
              startingIndex: currentIndex,
              disabledIndices: disabledIndicesRef.current,
            }),
          );
          indexRef.current = newIndex;
        }
      } else if (props.loopFocus) {
        if (currentIndex <= minIndex) {
          if (props.allowEscape && currentIndex !== -1) {
            indexRef.current = props.listRef.length;
          } else {
            // Give time for virtualizers to update the listRef.
            forceSyncFocusRef.current = false;
            indexRef.current = maxIndex;
          }
        } else {
          indexRef.current = findNonDisabledListIndex(props.listRef, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices: disabledIndicesRef.current,
          });
        }
      } else {
        const newIndex = Math.max(
          minIndex,
          findNonDisabledListIndex(props.listRef, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices: disabledIndicesRef.current,
          }),
        );
        indexRef.current = newIndex;
      }

      if (isIndexOutOfListBounds(props.listRef, indexRef.current)) {
        indexRef.current = -1;
      }

      onNavigate(event);

      // Keep keyboard navigation focus updates in the same event cycle.
      if (!props.virtual) {
        focusItem();
      }
    }
  };

  const ariaActiveDescendantProp: JSX.HTMLAttributes<HTMLElement> = {
    get 'aria-activedescendant'() {
      return props.virtual && open() && hasActiveIndex()
        ? `${props.id}-${activeIndex()}`
        : undefined;
    },
  };

  const floating: ElementProps['floating'] = {
    get 'aria-orientation'() {
      return props.orientation === 'both' ? undefined : props.orientation;
    },
    get 'aria-activedescendant'() {
      if (typeableComboboxReference()) {
        return undefined;
      }

      return ariaActiveDescendantProp['aria-activedescendant'];
    },
    onKeyDown(event) {
      // Close submenu on Shift+Tab
      if (event.key === 'Tab' && event.shiftKey && open() && !props.virtual) {
        // If the event originated from within a nested element (e.g., a Dialog opened from
        // within the menu), don't close the menu. The nested element has its own focus
        // management and should handle the Tab key.
        const target = getTarget(event) as Element | null;
        if (target && !contains(floatingFocusElement(), target)) {
          return;
        }

        stopEvent(event);
        store().setOpen(false, createChangeEventDetails(REASONS.focusOut, event));

        const domReference = domReferenceElement();
        if (isHTMLElement(domReference)) {
          domReference.focus();
        }

        return;
      }

      commonOnKeyDown(event);

      // Manually bubble across portals only if propagation wasn't stopped
      // by commonOnKeyDown (mirrors React's natural bubbling behavior).
      if (parentId != null && !(event as any).cancelBubble) {
        const eventObject = new KeyboardEvent('keydown', { key: event.key });
        const parentNode =
          tree && parentId != null ? tree.nodesRef.find((node) => node.id === parentId) : null;

        if (parentNode) {
          parentNode.context?.elements.floating()?.dispatchEvent(eventObject);
        }
      }
    },
    onPointerMove() {
      isPointerModalityRef.current = true;
    },
  };

  // TODO: This is a hack to get the event type to work.
  function checkVirtualMouse(event: MouseEvent) {
    if (props.focusItemOnOpen === 'auto' && isVirtualClick(event)) {
      focusItemOnOpenRef.current = !props.virtual;
    }
  }

  function checkVirtualPointer(event: PointerEvent) {
    // `pointerdown` fires first, reset the state then perform the checks.
    focusItemOnOpenRef.current = props.focusItemOnOpen;
    if (props.focusItemOnOpen === 'auto' && isVirtualPointerEvent(event)) {
      focusItemOnOpenRef.current = true;
    }
  }

  const trigger: ElementProps['trigger'] = {
    onKeyDown(event) {
      // non-reactive open state (to prevent re-creation of the handler)
      const currentOpen = store().select('open');
      isPointerModalityRef.current = false;

      const isArrowKey = event.key.startsWith('Arrow');
      const isParentCrossOpenKey = isCrossOrientationOpenKey(
        event.key,
        getParentOrientation(),
        props.rtl,
      );
      const isMainKey = isMainOrientationKey(event.key, props.orientation);
      const isNavigationKey =
        (props.nested ? isParentCrossOpenKey : isMainKey) ||
        event.key === 'Enter' ||
        event.key.trim() === '';

      if (props.virtual && currentOpen) {
        return commonOnKeyDown(event);
      }

      // If a floating element should not open on arrow key down, avoid
      // setting `activeIndex` while it's closed.
      if (!currentOpen && !props.openOnArrowKeyDown && isArrowKey) {
        return undefined;
      }

      if (isNavigationKey) {
        const isParentMainKey = isMainOrientationKey(event.key, getParentOrientation());
        keyRef.current = props.nested && isParentMainKey ? null : event.key;
      }

      if (props.nested) {
        if (isParentCrossOpenKey) {
          stopEvent(event);

          if (currentOpen) {
            const newIndex = getMinListIndex(props.listRef, disabledIndicesRef.current);
            indexRef.current = newIndex;
            onNavigate(event);
          } else {
            store().setOpen(
              true,
              createChangeEventDetails(
                REASONS.listNavigation,
                event,
                event.currentTarget as HTMLElement,
              ),
            );
          }
        }

        return undefined;
      }

      if (isMainKey) {
        const selected = selectedIndexRef.current;
        if (selected != null) {
          indexRef.current = selected;
        }

        stopEvent(event);

        if (!currentOpen && props.openOnArrowKeyDown) {
          /**
           * This will cause a synchronous change in the open state which
           * failes the next check for openAtStart.
           */
          store().setOpen(
            true,
            createChangeEventDetails(
              REASONS.listNavigation,
              event,
              event.currentTarget as HTMLElement,
            ),
          );
        } else {
          commonOnKeyDown(event);
        }

        if (currentOpen) {
          onNavigate(event);
        }
      }

      return undefined;
    },
    onFocus(event) {
      if (store().select('open') && !props.virtual && activeIndex() == null) {
        indexRef.current = -1;
        onNavigate(event);
      }
    },
    onPointerDown: checkVirtualPointer,
    onPointerEnter: checkVirtualPointer,
    onMouseDown: checkVirtualMouse,
    onClick: checkVirtualMouse,
  };

  const reference = solidMergeProps(ariaActiveDescendantProp, trigger) as ElementProps['reference'];

  return {
    get reference() {
      return props.enabled ? reference : undefined;
    },
    get floating() {
      return props.enabled ? floating : undefined;
    },
    item,
    get trigger() {
      return props.enabled ? trigger : undefined;
    },
  };
}
