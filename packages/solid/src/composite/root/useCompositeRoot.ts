import { isElementDisabled } from '@base-ui/utils/isElementDisabled';
import { createSignal, type Accessor } from 'solid-js';
import type { TextDirection } from '../../direction-provider/DirectionContext';
import { access, type MaybeAccessor } from '../../solid-helpers';
import type { HTMLProps } from '../../utils/types';
import {
  ALL_KEYS,
  ARROW_DOWN,
  ARROW_KEYS,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  END,
  HOME,
  HORIZONTAL_KEYS,
  HORIZONTAL_KEYS_WITH_EXTRA_KEYS,
  MODIFIER_KEYS,
  VERTICAL_KEYS,
  VERTICAL_KEYS_WITH_EXTRA_KEYS,
  createGridCellMap,
  findNonDisabledListIndex,
  getGridCellIndexOfCorner,
  getGridCellIndices,
  getGridNavigatedIndex,
  getMaxListIndex,
  getMinListIndex,
  isIndexOutOfListBounds,
  isListIndexDisabled,
  isNativeInput,
  scrollIntoViewIfNeeded,
  type Dimensions,
  type ModifierKey,
} from '../composite';
import { ACTIVE_COMPOSITE_ITEM } from '../constants';
import { type CompositeList, type CompositeMetadata } from '../list/CompositeList';

export interface UseCompositeRootParameters {
  orientation?: MaybeAccessor<'horizontal' | 'vertical' | 'both' | undefined>;
  cols?: MaybeAccessor<number | undefined>;
  loopFocus?: MaybeAccessor<boolean | undefined>;
  highlightedIndex?: MaybeAccessor<number | undefined>;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  dense?: MaybeAccessor<boolean | undefined>;
  itemSizes?: MaybeAccessor<Dimensions[] | undefined>;
  rootRef?: (HTMLElement | null) | undefined;
  /**
   * When `true`, pressing the Home key moves focus to the first item,
   * and pressing the End key moves focus to the last item.
   * @default false
   */
  enableHomeAndEndKeys?: MaybeAccessor<boolean | undefined>;
  /**
   * When `true`, keypress events on Composite's navigation keys
   * be stopped with event.stopPropagation().
   * @default false
   */
  stopEventPropagation?: MaybeAccessor<boolean | undefined>;
  /**
   * Array of item indices to be considered disabled.
   * Used for composite items that are focusable when disabled.
   */
  disabledIndices?: MaybeAccessor<number[] | undefined>;
  /**
   * Array of [modifier key values](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#modifier_keys) that should allow normal keyboard actions
   * when pressed. By default, all modifier keys prevent normal actions.
   * @default []
   */
  modifierKeys?: MaybeAccessor<ModifierKey[] | undefined>;
}

const EMPTY_ARRAY: never[] = [];

export function useCompositeRoot<Metadata>(
  params: UseCompositeRootParameters,
  direction: Accessor<TextDirection>,
) {
  const cols = () => access(params.cols) ?? 1;
  const loopFocus = () => access(params.loopFocus) ?? true;
  const dense = () => access(params.dense) ?? false;
  const orientation = () => access(params.orientation) ?? 'both';
  const enableHomeAndEndKeys = () => access(params.enableHomeAndEndKeys) ?? false;
  const stopEventPropagation = () => access(params.stopEventPropagation) ?? false;
  const modifierKeys = () => access(params.modifierKeys) ?? EMPTY_ARRAY;
  const disabledIndices = () => access(params.disabledIndices);

  const [internalHighlightedIndex, internalSetHighlightedIndex] = createSignal(0);

  const isGrid = () => cols() > 1;

  const [rootRef, setRootRef] = createSignal<HTMLElement | null | undefined>(null);

  const refs: CompositeList.Props<Metadata>['refs'] = {
    elements: [],
    labels: [],
  };

  let hasSetDefaultIndexRef = false;

  const highlightedIndex = () => access(params.highlightedIndex) ?? internalHighlightedIndex();
  function onHighlightedIndexChange(index: number, shouldScrollIntoView = false) {
    (params.onHighlightedIndexChange ?? internalSetHighlightedIndex)(index);
    if (shouldScrollIntoView) {
      const newActiveItem = refs.elements[index];
      scrollIntoViewIfNeeded(rootRef(), newActiveItem, direction(), orientation());
    }
  }

  function onMapChange(
    newMap: Array<{ element: Element; metadata: CompositeMetadata<any> | null }>,
  ) {
    if (newMap.length === 0 || hasSetDefaultIndexRef) {
      return;
    }
    hasSetDefaultIndexRef = true;
    const sortedElements = newMap.map((item) => item.element);
    const activeItem = sortedElements.find((compositeElement) =>
      compositeElement?.hasAttribute(ACTIVE_COMPOSITE_ITEM),
    ) as HTMLElement | null;
    // Set the default highlighted index of an arbitrary composite item.
    const activeIndex = activeItem ? sortedElements.indexOf(activeItem) : -1;
    if (activeIndex !== -1) {
      onHighlightedIndexChange(activeIndex);
    }

    scrollIntoViewIfNeeded(rootRef(), activeItem, direction(), orientation());
  }

  const props: HTMLProps = {
    get ['aria-orientation']() {
      const orientationValue = orientation();
      return orientationValue === 'both' ? undefined : orientationValue;
    },
    // Use focusin so the root is notified when one of its composite items receives focus.
    onFocusIn(event) {
      if (!rootRef() || !isNativeInput(event.target)) {
        return;
      }
      event.target.setSelectionRange(0, event.target.value.length ?? 0);
    },
    onKeyDown(event) {
      const RELEVANT_KEYS = enableHomeAndEndKeys() ? ALL_KEYS : ARROW_KEYS;
      if (!RELEVANT_KEYS.has(event.key)) {
        return;
      }

      if (isModifierKeySet(event, modifierKeys())) {
        return;
      }

      if (!rootRef()) {
        return;
      }

      const isRtl = direction() === 'rtl';
      const orientationValue = orientation();

      const horizontalForwardKey = isRtl ? ARROW_LEFT : ARROW_RIGHT;
      const forwardKey = {
        horizontal: horizontalForwardKey,
        vertical: ARROW_DOWN,
        both: horizontalForwardKey,
      }[orientationValue];
      const horizontalBackwardKey = isRtl ? ARROW_RIGHT : ARROW_LEFT;
      const backwardKey = {
        horizontal: horizontalBackwardKey,
        vertical: ARROW_UP,
        both: horizontalBackwardKey,
      }[orientationValue];

      if (isNativeInput(event.target) && !isElementDisabled(event.target)) {
        const selectionStart = event.target.selectionStart;
        const selectionEnd = event.target.selectionEnd;
        const textContent = event.target.value ?? '';
        // return to native textbox behavior when
        // 1 - Shift is held to make a text selection, or if there already is a text selection
        if (selectionStart == null || event.shiftKey || selectionStart !== selectionEnd) {
          return;
        }
        // 2 - arrow-ing forward and not in the last position of the text
        if (event.key !== backwardKey && selectionStart < textContent.length) {
          return;
        }
        // 3 -arrow-ing backward and not in the first position of the text
        if (event.key !== forwardKey && selectionStart > 0) {
          return;
        }
      }

      let nextIndex = highlightedIndex();
      const minIndex = getMinListIndex(refs.elements, disabledIndices());
      const maxIndex = getMaxListIndex(refs.elements, disabledIndices());

      if (isGrid()) {
        const sizes =
          access(params.itemSizes) ||
          Array.from({ length: refs.elements.length }, () => ({
            width: 1,
            height: 1,
          }));
        // To calculate movements on the grid, we use hypothetical cell indices
        // as if every item was 1x1, then convert back to real indices.
        const cellMap = createGridCellMap(sizes, cols(), dense());
        const minGridIndex = cellMap.findIndex(
          (index) => index != null && !isListIndexDisabled(refs.elements, index, disabledIndices()),
        );
        // last enabled index
        const maxGridIndex = cellMap.reduce(
          (foundIndex: number, index, cellIndex) =>
            index != null && !isListIndexDisabled(refs.elements, index, disabledIndices())
              ? cellIndex
              : foundIndex,
          -1,
        );
        nextIndex = cellMap[
          getGridNavigatedIndex(
            cellMap.map((itemIndex) => (itemIndex != null ? refs.elements[itemIndex] : null)),
            {
              event,
              orientation: orientationValue,
              loopFocus: loopFocus(),
              cols: cols(),
              // treat undefined (empty grid spaces) as disabled indices so we
              // don't end up in them
              disabledIndices: getGridCellIndices(
                [
                  ...(disabledIndices() ||
                    refs.elements.map((_, index) =>
                      isListIndexDisabled(refs.elements, index) ? index : undefined,
                    )),
                  undefined,
                ],
                cellMap,
              ),
              minIndex: minGridIndex,
              maxIndex: maxGridIndex,
              prevIndex: getGridCellIndexOfCorner(
                highlightedIndex() > maxIndex ? minIndex : highlightedIndex(),
                sizes,
                cellMap,
                cols(),
                // use a corner matching the edge closest to the direction we're
                // moving in so we don't end up in the same item. Prefer
                // top/left over bottom/right.
                // eslint-disable-next-line no-nested-ternary
                event.key === ARROW_DOWN ? 'bl' : event.key === ARROW_RIGHT ? 'tr' : 'tl',
              ),
              rtl: isRtl,
            },
          )
        ] as number; // navigated cell will never be nullish
      }

      const forwardKeys = {
        horizontal: [horizontalForwardKey],
        vertical: [ARROW_DOWN],
        both: [horizontalForwardKey, ARROW_DOWN],
      }[orientationValue];

      const backwardKeys = {
        horizontal: [horizontalBackwardKey],
        vertical: [ARROW_UP],
        both: [horizontalBackwardKey, ARROW_UP],
      }[orientationValue];

      const preventedKeys = isGrid()
        ? RELEVANT_KEYS
        : {
            horizontal: enableHomeAndEndKeys() ? HORIZONTAL_KEYS_WITH_EXTRA_KEYS : HORIZONTAL_KEYS,
            vertical: enableHomeAndEndKeys() ? VERTICAL_KEYS_WITH_EXTRA_KEYS : VERTICAL_KEYS,
            both: RELEVANT_KEYS,
          }[orientationValue];

      if (enableHomeAndEndKeys()) {
        if (event.key === HOME) {
          nextIndex = minIndex;
        } else if (event.key === END) {
          nextIndex = maxIndex;
        }
      }

      if (
        nextIndex === highlightedIndex() &&
        (forwardKeys.includes(event.key) || backwardKeys.includes(event.key))
      ) {
        if (loopFocus() && nextIndex === maxIndex && forwardKeys.includes(event.key)) {
          nextIndex = minIndex;
        } else if (loopFocus() && nextIndex === minIndex && backwardKeys.includes(event.key)) {
          nextIndex = maxIndex;
        } else {
          nextIndex = findNonDisabledListIndex(refs.elements, {
            startingIndex: nextIndex,
            decrement: backwardKeys.includes(event.key),
            disabledIndices: disabledIndices(),
          });
        }
      }

      if (nextIndex !== highlightedIndex() && !isIndexOutOfListBounds(refs.elements, nextIndex)) {
        if (stopEventPropagation()) {
          event.stopPropagation();
        }

        if (preventedKeys.has(event.key)) {
          event.preventDefault();
        }
        onHighlightedIndexChange(nextIndex, true);

        // Wait for FocusManager `returnFocus` to execute.
        queueMicrotask(() => {
          refs.elements[nextIndex]?.focus();
        });
      }
    },
  };

  return {
    props,
    refs,
    highlightedIndex,
    disabledIndices,
    rootRef,
    onHighlightedIndexChange,
    onMapChange,
    relayKeyboardEvent: props.onKeyDown!,
    setRootRef: (el: any) => {
      setRootRef(el);
      params.rootRef = el;
    },
  };
}

function isModifierKeySet(event: KeyboardEvent, ignoredModifierKeys: ModifierKey[]) {
  for (const key of MODIFIER_KEYS.values()) {
    if (ignoredModifierKeys.includes(key)) {
      continue;
    }
    if (event.getModifierState(key)) {
      return true;
    }
  }
  return false;
}
