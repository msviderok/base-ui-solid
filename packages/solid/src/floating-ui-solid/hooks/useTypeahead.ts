import { createEffect, createMemo } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { useTimeout } from '../../utils/useTimeout';
import type { ElementProps, FloatingContext, FloatingRootContext } from '../types';
import { contains, stopEvent } from '../utils';

export interface UseTypeaheadProps {
  /**
   * A ref which contains an array of strings whose indices match the HTML
   * elements of the list.
   * @default empty list
   */
  listRef: Array<string | null>;
  /**
   * The index of the active (focused or highlighted) item in the list.
   * @default null
   */
  activeIndex: number | null;
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
  enabled?: boolean | undefined;
  /**
   * The number of milliseconds to wait before resetting the typed string.
   * @default 750
   */
  resetMs?: number | undefined;
  /**
   * The index of the selected item in the list, if available.
   * @default null
   */
  selectedIndex?: (number | null) | undefined;
}

/**
 * Provides a matching callback that can be used to focus an item as the user
 * types, often used in tandem with `useListNavigation()`.
 * @see https://floating-ui.com/docs/useTypeahead
 */
export function useTypeahead(parameters: {
  context: FloatingRootContext | FloatingContext;
  props?: UseTypeaheadProps;
}): ElementProps {
  const props = defaultProps(parameters.props ?? ({} as Required<UseTypeaheadProps>), {
    enabled: true,
    resetMs: 750,
    selectedIndex: null,
  });

  const store = createMemo(() =>
    'rootStore' in parameters.context ? parameters.context.rootStore : parameters.context,
  );
  const dataRef = () => store().context.dataRef;
  const open = createMemo(() => store().select('open'));

  const timeout = useTimeout();
  let stringRef = '';
  let prevIndexRef: number | null = props.selectedIndex ?? props.activeIndex ?? -1;
  let matchIndexRef: number | null = null;

  createEffect(() => {
    if (!open() && props.selectedIndex !== null) {
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
      prevIndexRef = props.selectedIndex ?? props.activeIndex ?? -1;
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

    if (stringRef.length > 0 && stringRef[0] !== ' ') {
      if (getMatchingIndex(props.listRef, props.listRef, stringRef) === -1) {
        setTypingChange(false);
      } else if (event.key === ' ') {
        stopEvent(event);
      }
    }

    if (
      props.listRef == null ||
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
      prevIndexRef = props.selectedIndex ?? props.activeIndex ?? -1;
    }

    // Bail out if the list contains a word like "llama" or "aaron". TODO:
    // allow it in this case, too.
    const allowRapidSuccessionOfFirstLetter = props.listRef.every((text) =>
      text ? text[0]?.toLocaleLowerCase() !== text[1]?.toLocaleLowerCase() : true,
    );

    // Allows the user to cycle through items that start with the same letter
    // in rapid succession.
    if (allowRapidSuccessionOfFirstLetter && stringRef === event.key) {
      stringRef = '';
      prevIndexRef = matchIndexRef;
    }

    stringRef += event.key;
    const fn = () => {
      stringRef = '';
      prevIndexRef = matchIndexRef;
      setTypingChange(false);
    };
    timeout.start(props.resetMs, fn);

    // Compute the starting index for this search.
    // If this is a new typing session (string is empty), base it on the current
    // selection/active item; otherwise continue from the last matched index.
    const prevIndex = isNewSession
      ? (props.selectedIndex ?? props.activeIndex ?? -1)
      : prevIndexRef;

    const index = getMatchingIndex(
      props.listRef,
      [
        ...props.listRef.slice((prevIndex || 0) + 1),
        ...props.listRef.slice(0, (prevIndex || 0) + 1),
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

  const reference: ElementProps['reference'] = {
    onKeyDown,
    onBlur,
  };

  const floating: ElementProps['floating'] = {
    onKeyDown,
    onKeyUp(event) {
      if (event.key === ' ') {
        setTypingChange(false);
      }
    },
    onBlur,
  };

  return {
    get reference() {
      return props.enabled ? reference : undefined;
    },
    get floating() {
      return props.enabled ? floating : undefined;
    },
  };
}
