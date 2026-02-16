import { ownerDocument } from '@base-ui/utils/owner';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { createEffect, createMemo, on, onCleanup, type Accessor } from 'solid-js';
import { access, type MaybeAccessor, type MaybeAccessorValue } from '../../solid-helpers';
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
  orientation: MaybeAccessorValue<UseListNavigationProps['orientation']>,
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

function isMainOrientationKey(
  key: string,
  orientation: MaybeAccessorValue<UseListNavigationProps['orientation']>,
) {
  const vertical = key === ARROW_UP || key === ARROW_DOWN;
  const horizontal = key === ARROW_LEFT || key === ARROW_RIGHT;
  return doSwitch(orientation, vertical, horizontal);
}

function isMainOrientationToEndKey(
  key: string,
  orientation: MaybeAccessorValue<UseListNavigationProps['orientation']>,
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
  orientation: MaybeAccessorValue<UseListNavigationProps['orientation']>,
  rtl: boolean,
) {
  const vertical = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  const horizontal = key === ARROW_DOWN;
  return doSwitch(orientation, vertical, horizontal);
}

function isCrossOrientationCloseKey(
  key: string,
  orientation: MaybeAccessorValue<UseListNavigationProps['orientation']>,
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
  listRef: MaybeAccessor<Array<HTMLElement | null | undefined>>;
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: MaybeAccessor<number | null>;
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
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * The currently selected item index, which may or may not be active.
   * @default null
   */
  selectedIndex?: MaybeAccessor<(number | null) | undefined>;
  /**
   * Whether to focus the item upon opening the floating element. 'auto' infers
   * what to do based on the input type (keyboard vs. pointer), while a boolean
   * value will force the value.
   * @default 'auto'
   */
  focusItemOnOpen?: MaybeAccessor<(boolean | 'auto') | undefined>;
  /**
   * Whether hovering an item synchronizes the focus.
   * @default true
   */
  focusItemOnHover?: MaybeAccessor<boolean | undefined>;
  /**
   * Whether pressing an arrow key on the navigation’s main axis opens the
   * floating element.
   * @default true
   */
  openOnArrowKeyDown?: MaybeAccessor<boolean | undefined>;
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
  allowEscape?: MaybeAccessor<boolean | undefined>;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   * @default false
   */
  loopFocus?: MaybeAccessor<boolean | undefined>;
  /**
   * If the list is nested within another one (e.g. a nested submenu), the
   * navigation semantics change.
   * @default false
   */
  nested?: MaybeAccessor<boolean | undefined>;
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
  rtl?: MaybeAccessor<boolean | undefined>;
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
  virtual?: MaybeAccessor<boolean | undefined>;
  /**
   * The orientation in which navigation occurs.
   * @default 'vertical'
   */
  orientation?: MaybeAccessor<('vertical' | 'horizontal' | 'both') | undefined>;
  /**
   * Specifies how many columns the list has (i.e., it’s a grid). Use an
   * orientation of 'horizontal' (e.g. for an emoji picker/date picker, where
   * pressing ArrowRight or ArrowLeft can change rows), or 'both' (where the
   * current row cannot be escaped with ArrowRight or ArrowLeft, only ArrowUp
   * and ArrowDown).
   * @default 1
   */
  cols?: MaybeAccessor<number | undefined>;
  /**
   * The id of the root component.
   */
  id?: MaybeAccessor<string | undefined>;
  /**
   * Whether to clear the active index when the pointer leaves an item.
   * @default true
   */
  resetOnPointerLeave?: MaybeAccessor<boolean | undefined>;
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
export function useListNavigation(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseListNavigationProps,
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().useState('open')();
  const floatingElement = () => store().useState('floatingElement')();
  const domReferenceElement = () => store().useState('domReferenceElement')();
  const dataRef = () => store().context.dataRef;

  const listRef = () => access(props.listRef);
  const activeIndex = () => access(props.activeIndex);
  const enabled = () => access(props.enabled) ?? true;
  const selectedIndex = () => access(props.selectedIndex) ?? null;
  const allowEscape = () => access(props.allowEscape) ?? false;
  const loopFocus = () => access(props.loopFocus) ?? false;
  const nested = () => access(props.nested) ?? false;
  const rtl = () => access(props.rtl) ?? false;
  const virtual = () => access(props.virtual) ?? false;
  const focusItemOnOpen = () => access(props.focusItemOnOpen) ?? 'auto';
  const focusItemOnHover = () => access(props.focusItemOnHover) ?? true;
  const openOnArrowKeyDown = () => access(props.openOnArrowKeyDown) ?? true;
  const orientation = () => access(props.orientation) ?? 'vertical';
  const parentOrientation = () => access(props.parentOrientation);
  const cols = () => access(props.cols) ?? 1;
  const id = () => access(props.id);
  const resetOnPointerLeave = () => access(props.resetOnPointerLeave) ?? true;
  const disabledIndices = () => props.disabledIndices;

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() => {
      if (allowEscape()) {
        if (!loopFocus()) {
          console.warn('`useListNavigation` looping must be enabled to allow escaping.');
        }

        if (!virtual()) {
          console.warn('`useListNavigation` must be virtual to allow escaping.');
        }
      }

      if (orientation() === 'vertical' && cols() > 1) {
        console.warn(
          'In grid list navigation mode (`cols` > 1), the `orientation` should',
          'be either "horizontal" or "both".',
        );
      }
    });
  }

  const floatingFocusElement = () => getFloatingFocusElement(floatingElement());

  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree(props.externalTree);

  createEffect(() => {
    dataRef().orientation = orientation();
  });

  /**
   * TODO: this needs to be memoized as it causes an infinite loop
   * with the MenuRoot triggerElement assignement
   */
  const typeableComboboxReference = createMemo(() => isTypeableCombobox(domReferenceElement()));

  let focusItemOnOpenRef = focusItemOnOpen();
  let indexRef = selectedIndex() ?? -1;
  let keyRef: null | string = null;
  let isPointerModalityRef = true;

  const onNavigate = (event?: Event) => {
    props.onNavigate?.(indexRef === -1 ? null : indexRef, event);
  };

  let forceSyncFocusRef = false;
  let forceScrollIntoViewRef = false;
  let previousMountedRef = false;
  let previousOpenRef = false;

  const focusItem = () => {
    function runFocus(item: HTMLElement) {
      if (virtual()) {
        tree?.events.emit('virtualfocus', item);
      } else {
        enqueueFocus(item, {
          sync: forceSyncFocusRef,
          preventScroll: true,
        });
      }
    }

    const initialItem = listRef()?.[indexRef];
    const forceScrollIntoView = forceScrollIntoViewRef;
    if (initialItem) {
      runFocus(initialItem);
    }

    const scheduler = forceSyncFocusRef ? (v: () => void) => v() : requestAnimationFrame;

    scheduler(() => {
      const waitedItem = listRef()[indexRef] || initialItem;

      if (!waitedItem) {
        return;
      }

      if (!initialItem) {
        runFocus(waitedItem);
      }

      const shouldScrollIntoView =
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        item() && (forceScrollIntoView || !isPointerModalityRef);

      if (shouldScrollIntoView) {
        // JSDOM doesn't support `.scrollIntoView()` but it's widely supported
        // by all browsers.
        waitedItem.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }
    });
  };

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    if (open() && floatingElement()) {
      const selected = selectedIndex();
      indexRef = selected ?? -1;
      if (focusItemOnOpenRef && selected != null) {
        // Regardless of the pointer modality, we want to ensure the selected
        // item comes into view when the floating element is opened.
        forceScrollIntoViewRef = true;
        onNavigate();
      }
    } else if (previousMountedRef) {
      indexRef = -1;
      onNavigate();
    }
  });

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  createEffect(() => {
    if (!enabled()) {
      return;
    }

    if (!open()) {
      forceSyncFocusRef = false;
      return;
    }

    if (!floatingElement()) {
      return;
    }

    const idx = activeIndex();
    const list = listRef();

    if (idx == null) {
      forceSyncFocusRef = false;

      if (selectedIndex() != null) {
        return;
      }

      // Reset while the floating element was open (e.g. the list changed).
      if (previousMountedRef) {
        indexRef = -1;
        focusItem();
      }

      // Initial sync.
      if (
        (!previousOpenRef || !previousMountedRef) &&
        focusItemOnOpenRef &&
        (keyRef != null || (focusItemOnOpenRef === true && keyRef == null))
      ) {
        let runs = 0;
        const waitForListPopulated = () => {
          if (list[0] == null) {
            // Avoid letting the browser paint if possible on the first try,
            // otherwise use rAF. Don't try more than twice, since something
            // is wrong otherwise.
            if (runs < 2) {
              const scheduler = runs ? requestAnimationFrame : queueMicrotask;
              scheduler(waitForListPopulated);
            }
            runs += 1;
          } else {
            // initially focus the first non-disabled item
            indexRef =
              keyRef == null || isMainOrientationToEndKey(keyRef, orientation(), rtl()) || nested()
                ? getMinListIndex(list)
                : getMaxListIndex(list);
            keyRef = null;

            previousMountedRef = true;
            previousOpenRef = true;
            onNavigate();
          }
        };

        waitForListPopulated();
      }
    } else if (!isIndexOutOfListBounds(list, idx)) {
      indexRef = idx;
      focusItem();
      forceScrollIntoViewRef = false;
      previousMountedRef = true;
      previousOpenRef = true;
    }
  });

  // Ensure the parent floating element has focus when a nested child closes
  // to allow arrow key navigation to work after the pointer leaves the child.
  createEffect(() => {
    if (!enabled() || floatingElement() || !tree || virtual() || !previousMountedRef) {
      return;
    }

    const nodes = tree.nodesRef;
    const parentNode = nodes.find((node) => node.id === parentId);
    const parent = parentNode ? access(parentNode.context)?.elements.floating() : undefined;
    const activeEl = activeElement(ownerDocument(floatingElement() ?? null));
    const treeContainsActiveEl = nodes.some(
      (node) => node.context && contains(node.context.elements.floating(), activeEl),
    );

    if (parent && !treeContainsActiveEl && isPointerModalityRef) {
      parent.focus({ preventScroll: true });
    }
  });

  createEffect(
    on(floatingElement, () => {
      onCleanup(() => {
        previousMountedRef = false;
        previousOpenRef = false;
      });
    }),
  );

  createEffect(() => {
    previousOpenRef = open();
    previousMountedRef = !!floatingElement();
  });

  createEffect(() => {
    if (!open()) {
      keyRef = null;
      focusItemOnOpenRef = focusItemOnOpen();
    }
  });

  const hasActiveIndex = () => activeIndex() != null;

  const item = createMemo<ElementProps['item']>(() => {
    function syncCurrentTarget(event: Event) {
      if (!open()) {
        return;
      }
      const index = listRef().indexOf(event.currentTarget as HTMLElement);
      if (index !== -1 && indexRef !== index) {
        indexRef = index;
        onNavigate(event);
      }
    }

    const itemProps: ElementProps['item'] = {
      onFocus(event) {
        forceSyncFocusRef = true;
        syncCurrentTarget(event);
      },
      onClick: ({ currentTarget }) => currentTarget.focus({ preventScroll: true }), // Safari
      onMouseMove(event) {
        forceSyncFocusRef = true;
        forceScrollIntoViewRef = false;
        if (focusItemOnHover()) {
          syncCurrentTarget(event);
        }
      },
      onPointerLeave(event) {
        if (!open() || !isPointerModalityRef || event.pointerType === 'touch') {
          return;
        }

        forceSyncFocusRef = true;

        const relatedTarget = event.relatedTarget as HTMLElement | null;

        if (!focusItemOnHover() || listRef().includes(relatedTarget)) {
          return;
        }

        if (!resetOnPointerLeave()) {
          return;
        }

        enqueueFocus(null, { sync: true });
        indexRef = -1;
        onNavigate(event);

        if (!virtual()) {
          floatingFocusElement()?.focus({ preventScroll: true });
        }
      },
    };

    return itemProps;
  });

  const getParentOrientation = () => {
    if (parentOrientation()) {
      return parentOrientation()!;
    }

    const parentNode = tree?.nodesRef?.find((node) => node.id === parentId);
    return parentNode ? access(parentNode.context)?.dataRef?.orientation : undefined;
  };

  const commonOnKeyDown = (event: KeyboardEvent) => {
    isPointerModalityRef = false;
    forceSyncFocusRef = true;

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
    if (!open() && event.currentTarget === floatingFocusElement() && !dataRef().__closing) {
      return;
    }

    if (nested() && isCrossOrientationCloseKey(event.key, orientation(), rtl(), cols())) {
      // If the nested list's close key is also the parent navigation key,
      // let the parent navigate. Otherwise, stop propagating the event.
      if (!isMainOrientationKey(event.key, getParentOrientation())) {
        stopEvent(event);

        if (dataRef().__closing) {
          event.stopImmediatePropagation();
          delete dataRef().__closing;
        }
      }

      // TODO: explain this
      queueMicrotask(() => {
        store().setOpen(false, createChangeEventDetails(REASONS.listNavigation, event));
      });

      const domReference = domReferenceElement();
      if (isHTMLElement(domReference)) {
        if (virtual()) {
          tree?.events.emit('virtualfocus', domReference);
        } else {
          domReference.focus();
        }
      }

      return;
    }

    const currentIndex = indexRef;
    const minIndex = getMinListIndex(listRef(), disabledIndices());
    const maxIndex = getMaxListIndex(listRef(), disabledIndices());

    if (!typeableComboboxReference()) {
      if (event.key === 'Home') {
        stopEvent(event);
        indexRef = minIndex;
        onNavigate(event);
      }

      if (event.key === 'End') {
        stopEvent(event);
        indexRef = maxIndex;
        onNavigate(event);
      }
    }

    // Grid navigation.
    if (cols() > 1) {
      const sizes = Array.from({ length: listRef().length }, () => ({
        width: 1,
        height: 1,
      }));
      // To calculate movements on the grid, we use hypothetical cell indices
      // as if every item was 1x1, then convert back to real indices.

      const cellMap = createGridCellMap(sizes, cols(), false);
      const minGridIndex = cellMap.findIndex(
        (index) => index != null && !isListIndexDisabled(listRef(), index, disabledIndices()),
      );
      // last enabled index
      const maxGridIndex = cellMap.reduce(
        // eslint-disable-next-line solid/reactivity
        (foundIndex: number, index, cellIndex) =>
          index != null && !isListIndexDisabled(listRef(), index, disabledIndices())
            ? cellIndex
            : foundIndex,
        -1,
      );

      const index =
        cellMap[
          getGridNavigatedIndex(
            cellMap.map((itemIndex) => (itemIndex != null ? listRef()[itemIndex] : null)),
            {
              event,
              orientation: orientation(),
              loopFocus: loopFocus(),
              rtl: rtl(),
              cols: cols(),
              // treat undefined (empty grid spaces) as disabled indices so we
              // don't end up in them
              // TODO: I'm not sure if this is "the best" way to do this
              disabledIndices: () =>
                getGridCellIndices(
                  [
                    ...listRef().map((_, listIndex) =>
                      isListIndexDisabled(listRef(), listIndex, disabledIndices())
                        ? listIndex
                        : undefined,
                    ),
                    undefined,
                  ],
                  cellMap,
                ),
              minIndex: minGridIndex,
              maxIndex: maxGridIndex,
              prevIndex: getGridCellIndexOfCorner(
                indexRef > maxIndex ? minIndex : indexRef,
                sizes,
                cellMap,
                cols(),
                // use a corner matching the edge closest to the direction
                // we're moving in so we don't end up in the same item. Prefer
                // top/left over bottom/right.
                // eslint-disable-next-line no-nested-ternary
                event.key === ARROW_DOWN
                  ? 'bl'
                  : event.key === (rtl() ? ARROW_LEFT : ARROW_RIGHT)
                    ? 'tr'
                    : 'tl',
              ),
              stopEvent: true,
            },
          )
        ];

      if (index != null) {
        indexRef = index;
        onNavigate(event);
      }

      if (orientation() === 'both') {
        return;
      }
    }

    if (isMainOrientationKey(event.key, orientation())) {
      stopEvent(event);

      // Reset the index if no item is focused.
      if (
        open() &&
        !virtual() &&
        activeElement((event.currentTarget as any)?.ownerDocument) === event.currentTarget
      ) {
        const newIndex = isMainOrientationToEndKey(event.key, orientation(), rtl())
          ? minIndex
          : maxIndex;
        indexRef = newIndex;

        onNavigate(event);
        return;
      }

      if (isMainOrientationToEndKey(event.key, orientation(), rtl())) {
        if (loopFocus()) {
          if (currentIndex >= maxIndex) {
            if (allowEscape() && currentIndex !== listRef().length) {
              indexRef = -1;
            } else {
              // Give time for virtualizers to update the listRef.
              forceSyncFocusRef = false;
              indexRef = minIndex;
            }
          } else {
            indexRef = findNonDisabledListIndex(listRef(), {
              startingIndex: currentIndex,
              disabledIndices: disabledIndices(),
            });
          }
        } else {
          const newIndex = Math.min(
            maxIndex,
            findNonDisabledListIndex(listRef(), {
              startingIndex: currentIndex,
              disabledIndices: disabledIndices(),
            }),
          );
          indexRef = newIndex;
        }
      } else if (loopFocus()) {
        if (currentIndex <= minIndex) {
          if (allowEscape() && currentIndex !== -1) {
            indexRef = listRef().length;
          } else {
            // Give time for virtualizers to update the listRef.
            forceSyncFocusRef = false;
            indexRef = maxIndex;
          }
        } else {
          indexRef = findNonDisabledListIndex(listRef(), {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices: disabledIndices(),
          });
        }
      } else {
        const newIndex = Math.max(
          minIndex,
          findNonDisabledListIndex(listRef(), {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices: disabledIndices(),
          }),
        );
        indexRef = newIndex;
      }

      if (isIndexOutOfListBounds(listRef(), indexRef)) {
        indexRef = -1;
      }

      onNavigate(event);
    }
  };

  const ariaActiveDescendantProp = () => {
    return (
      virtual() &&
      open() &&
      hasActiveIndex() && {
        'aria-activedescendant': `${id()}-${activeIndex()}`,
      }
    );
  };

  const floating = createMemo<ElementProps['floating']>(() => {
    const typesafeOrientation = orientation();
    return {
      'aria-orientation': typesafeOrientation === 'both' ? undefined : typesafeOrientation,
      ...(!typeableComboboxReference() ? ariaActiveDescendantProp() : {}),
      onKeyDown(event) {
        // Close submenu on Shift+Tab
        if (event.key === 'Tab' && event.shiftKey && open() && !virtual()) {
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
      },
      // TODO SOLID CHECK
      // onKeyDown(event) {
      //   commonOnKeyDown(event);
      //   // Manually bubble across portals only if propagation wasn't stopped
      //   // by commonOnKeyDown (mirrors React's natural bubbling behavior).
      //   if (parentId != null && !(event as any).cancelBubble) {
      //     const eventObject = new KeyboardEvent('keydown', { key: event.key });
      //     const parentNode =
      //       tree && parentId != null ? tree?.nodesRef.find((node) => node.id === parentId) : null;
      //     if (parentNode) {
      //       parentNode.context?.elements.floating()?.dispatchEvent(eventObject);
      //     }
      //   }
      // },
      onPointerMove: () => {
        isPointerModalityRef = true;
      },
    };
  });

  const trigger = createMemo<ElementProps['trigger']>(() => {
    // TODO: This is a hack to get the event type to work.
    function checkVirtualMouse(event: MouseEvent) {
      if (focusItemOnOpen() === 'auto' && isVirtualClick(event)) {
        focusItemOnOpenRef = !virtual();
      }
    }

    function checkVirtualPointer(event: PointerEvent) {
      // `pointerdown` fires first, reset the state then perform the checks.
      focusItemOnOpenRef = focusItemOnOpen();
      if (focusItemOnOpen() === 'auto' && isVirtualPointerEvent(event)) {
        focusItemOnOpenRef = true;
      }
    }

    return {
      onKeyDown: (event) => {
        // non-reactive open state (to prevent re-creation of the handler)
        const currentOpen = store().select('open');
        isPointerModalityRef = false;

        const isArrowKey = event.key.startsWith('Arrow');
        const isParentCrossOpenKey = isCrossOrientationOpenKey(
          event.key,
          getParentOrientation(),
          rtl(),
        );
        const isMainKey = isMainOrientationKey(event.key, orientation());
        const isNavigationKey =
          (nested() ? isParentCrossOpenKey : isMainKey) ||
          event.key === 'Enter' ||
          event.key.trim() === '';

        if (virtual() && currentOpen) {
          return commonOnKeyDown(event);
        }

        // If a floating element should not open on arrow key down, avoid
        // setting `activeIndex` while it's closed.
        if (!currentOpen && !openOnArrowKeyDown() && isArrowKey) {
          return undefined;
        }

        if (isNavigationKey) {
          const isParentMainKey = isMainOrientationKey(event.key, getParentOrientation());
          keyRef = nested() && isParentMainKey ? null : event.key;
        }

        if (nested()) {
          if (isParentCrossOpenKey) {
            stopEvent(event);

            if (currentOpen) {
              const newIndex = getMinListIndex(listRef(), disabledIndices());
              indexRef = newIndex;
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
          const selected = selectedIndex();
          if (selected != null) {
            indexRef = selected;
          }

          stopEvent(event);

          if (!currentOpen && openOnArrowKeyDown()) {
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
        if (store().select('open') && !virtual()) {
          indexRef = -1;
          onNavigate(event);
        }
      },
      onPointerDown: checkVirtualPointer,
      onPointerEnter: checkVirtualPointer,
      onMouseDown: checkVirtualMouse,
      onClick: checkVirtualMouse,
    };
  });

  const reference = createMemo<ElementProps['reference']>(() => {
    return {
      ...ariaActiveDescendantProp(),
      ...trigger(),
    };
  });

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference(), floating: floating(), item: item(), trigger: trigger() };
  });

  return returnValue;
}
