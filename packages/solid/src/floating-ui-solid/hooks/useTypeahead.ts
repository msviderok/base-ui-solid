import { createEffect, createMemo, type Accessor } from 'solid-js';
import { access, type MaybeAccessor } from '../../solid-helpers';
import { useTimeout } from '../../utils/useTimeout';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { contains, stopEvent } from '../utils';

export interface UseTypeaheadProps {
  /**
   * A ref which contains an array of strings whose indices match the HTML
   * elements of the list.
   * @default empty list
   */
  listRef: MaybeAccessor<Array<string | null>>;
  /**
   * The index of the active (focused or highlighted) item in the list.
   * @default null
   */
  activeIndex: MaybeAccessor<number | null>;
  /**
   * Callback invoked with the matching index if found as the user types.
   */
  onMatch?: ((index: number) => void) | undefined;
  /**
   * Callback invoked with the typing state as the user types.
   */
  onTypingChange?: ((isTyping: boolean) => void) | undefined;
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * The number of milliseconds to wait before resetting the typed string.
   * @default 750
   */
  resetMs?: MaybeAccessor<number | undefined>;
  /**
   * The index of the selected item in the list, if available.
   * @default null
   */
  selectedIndex?: MaybeAccessor<(number | null) | undefined>;
}

/**
 * Provides a matching callback that can be used to focus an item as the user
 * types, often used in tandem with `useListNavigation()`.
 * @see https://floating-ui.com/docs/useTypeahead
 */
export function useTypeahead(
  contextProp: MaybeAccessor<FloatingRootContext | FloatingContext>,
  props: UseTypeaheadProps,
): Accessor<ElementProps> {
  const context = () => access(contextProp);
  const store = () => {
    const ctx = context();
    return 'rootStore' in ctx ? ctx.rootStore : ctx;
  };
  const open = () => store().useState('open')();
  const dataRef = () => store().context.dataRef;
  const listRef = () => access(props.listRef);
  const activeIndex = () => access(props.activeIndex);
  const enabled = () => access(props.enabled) ?? true;
  const resetMs = () => access(props.resetMs) ?? 750;
  const selectedIndex = () => access(props.selectedIndex) ?? null;

  const timeout = useTimeout();
  let stringRef = '';
  let prevIndexRef: number | null = selectedIndex() ?? activeIndex() ?? -1;
  let matchIndexRef: number | null = null;

  createEffect(() => {
    if (!open() && selectedIndex() !== null) {
      return;
    }

    timeout.clear();
    matchIndexRef = null;

    if (stringRef !== '') {
      stringRef = '';
    }
  });

  createEffect(() => {
    // Sync arrow key navigation but not typeahead navigation.
    if (open() && stringRef === '') {
      prevIndexRef = selectedIndex() ?? activeIndex() ?? -1;
    }
  });

  const setTypingChange = (value: boolean) => {
    if (value) {
      if (!dataRef().typing) {
        dataRef().typing = value;
        props.onTypingChange?.(value);
      }
    } else if (dataRef().typing) {
      dataRef().typing = value;
      props.onTypingChange?.(value);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    function getMatchingIndex(
      list: Array<string | null>,
      orderedList: Array<string | null>,
      string: string,
    ) {
      const str = orderedList.find(
        (text) => text?.toLocaleLowerCase().indexOf(string.toLocaleLowerCase()) === 0,
      );

      return str ? list.indexOf(str) : -1;
    }

    const listContent = listRef();

    if (stringRef.length > 0 && stringRef[0] !== ' ') {
      if (getMatchingIndex(listContent, listContent, stringRef) === -1) {
        setTypingChange(false);
      } else if (event.key === ' ') {
        stopEvent(event);
      }
    }

    if (
      listContent == null ||
      // Character key.
      event.key.length !== 1 ||
      // Modifier key.
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (open() && event.key !== ' ') {
      stopEvent(event);
      setTypingChange(true);
    }

    // Capture whether this is a new typing session before mutating the string.
    const isNewSession = stringRef === '';
    if (isNewSession) {
      prevIndexRef = selectedIndex() ?? activeIndex() ?? -1;
    }

    // Bail out if the list contains a word like "llama" or "aaron". TODO:
    // allow it in this case, too.
    const allowRapidSuccessionOfFirstLetter = listContent.every((text) =>
      text ? text[0]?.toLocaleLowerCase() !== text[1]?.toLocaleLowerCase() : true,
    );

    // Allows the user to cycle through items that start with the same letter
    // in rapid succession.
    if (allowRapidSuccessionOfFirstLetter && stringRef === event.key) {
      stringRef = '';
      prevIndexRef = matchIndexRef;
    }

    stringRef += event.key;
    timeout.start(resetMs(), () => {
      stringRef = '';
      prevIndexRef = matchIndexRef;
      setTypingChange(false);
    });

    // Compute the starting index for this search.
    // If this is a new typing session (string is empty), base it on the current
    // selection/active item; otherwise continue from the last matched index.
    const prevIndex = isNewSession ? (selectedIndex() ?? activeIndex() ?? -1) : prevIndexRef;

    const index = getMatchingIndex(
      listContent,
      [
        ...listContent.slice((prevIndexRef || 0) + 1),
        ...listContent.slice(0, (prevIndexRef || 0) + 1),
      ],
      stringRef,
    );

    if (index !== -1) {
      props.onMatch?.(index);
      matchIndexRef = index;
    } else if (event.key !== ' ') {
      stringRef = '';
      setTypingChange(false);
    }
  };

  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Element | null;
    const currentDomReferenceElement = store().select('domReferenceElement');
    const currentFloatingElement = store().select('floatingElement');
    const withinReference = contains(currentDomReferenceElement, next);
    const withinFloating = contains(currentFloatingElement, next);

    // Keep the session if focus moves within the composite (reference <-> floating).
    if (withinReference || withinFloating) {
      return;
    }

    // End the current typing session when focus leaves the composite entirely.
    timeout.clear();
    stringRef = '';
    prevIndexRef = matchIndexRef;
    setTypingChange(false);
  };

  const reference = createMemo<ElementProps['reference']>(() => ({ onKeyDown, onBlur }));

  const floating = createMemo<ElementProps['floating']>(() => ({
    onKeyDown,
    onKeyUp: (event) => {
      if (event.key === ' ') {
        setTypingChange(false);
      }
    },
    onBlur,
  }));

  const returnValue = createMemo<ElementProps>(() => {
    if (!enabled()) {
      return {};
    }

    return { reference: reference(), floating: floating() };
  });

  return returnValue;
}
