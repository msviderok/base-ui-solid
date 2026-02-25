import { access, type MaybeAccessor, type ReactLikeRef } from '../../solid-helpers';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import type { HTMLProps } from '../../utils/types';
import type { Timeout } from '../../utils/useTimeout';
import {
  DEFAULT_STEP,
  MAX_POINTER_MOVES_AFTER_TOUCH,
  SCROLLING_POINTER_MOVE_DISTANCE,
  TOUCH_TIMEOUT,
} from '../utils/constants';
import { parseNumber } from '../utils/parse';
import type {
  Direction,
  EventWithOptionalKeyState,
  IncrementValueParameters,
} from '../utils/types';
import type { NumberFieldRoot } from './NumberFieldRoot';

// Treat pen as touch-like to avoid forcing the software keyboard on stylus taps.
// Linux Chrome may emit "pen" historically for mouse usage due to a bug, but the touch path
// still works with minor behavioral differences.
function isTouchLikePointerType(pointerType: string) {
  return pointerType === 'touch' || pointerType === 'pen';
}

export function useNumberFieldButton(params: useNumberFieldButton.Parameters) {
  const disabled = () => access(params.disabled);
  const id = () => access(params.id);
  const inputValue = () => access(params.inputValue);
  const isIncrement = () => access(params.isIncrement);
  const locale = () => access(params.locale);
  const readOnly = () => access(params.readOnly);

  let incrementDownCoordsRef = { x: 0, y: 0 };
  let isTouchingButtonRef = false;
  let ignoreClickRef = false;
  let pointerTypeRef = '' as 'mouse' | 'touch' | 'pen' | '';

  const pressReason = (): NumberFieldRoot.ChangeEventReason =>
    isIncrement() ? 'increment-press' : 'decrement-press';

  function commitValue(nativeEvent: MouseEvent) {
    params.allowInputSyncRef.current = true;

    // The input may be dirty but not yet blurred, so the value won't have been committed.
    const parsedValue = parseNumber(inputValue(), locale(), params.formatOptionsRef.current);

    if (parsedValue !== null) {
      // The increment value function needs to know the current input value to increment it
      // correctly.
      params.valueRef.current = parsedValue;
      params.setValue(
        parsedValue,
        createChangeEventDetails<
          NumberFieldRoot.ChangeEventReason,
          { direction?: Direction | undefined }
        >(pressReason(), nativeEvent, undefined, {
          direction: isIncrement() ? 1 : -1,
        }),
      );
    }
  }

  const props: HTMLProps = {
    // @ts-expect-error - disabled is not a valid attribute for HTMLProps
    get disabled() {
      return disabled();
    },
    get 'aria-readonly'() {
      return readOnly() || undefined;
    },
    get 'aria-label'() {
      return isIncrement() ? 'Increase' : 'Decrease';
    },
    get 'aria-controls'() {
      return id();
    },
    // Keyboard users shouldn't have access to the buttons, since they can use the input element
    // to change the value. On the other hand, `aria-hidden` is not applied because touch screen
    // readers should be able to use the buttons.
    tabIndex: -1,
    style: {
      '--webkit-user-select': 'none',
      'user-select': 'none',
    },
    onTouchStart() {
      isTouchingButtonRef = true;
    },
    onTouchEnd() {
      isTouchingButtonRef = false;
    },
    onClick(event) {
      const isDisabled = disabled() || readOnly();
      if (
        event.defaultPrevented ||
        isDisabled ||
        // If it's not a keyboard/virtual click, ignore.
        (isTouchLikePointerType(pointerTypeRef) ? ignoreClickRef : event.detail !== 0)
      ) {
        return;
      }

      commitValue(event);

      const amount = params.getStepAmount(event) ?? DEFAULT_STEP;

      const prev = params.valueRef.current;

      params.incrementValue(amount, {
        direction: isIncrement() ? 1 : -1,
        event,
        reason: pressReason() as any,
      });

      const committed = params.lastChangedValueRef.current ?? params.valueRef.current;
      if (committed !== prev) {
        params.onValueCommitted(committed, createGenericEventDetails(pressReason(), event));
      }
    },
    onPointerDown(event) {
      const isMainButton = !event.button || event.button === 0;
      if (event.defaultPrevented || readOnly() || !isMainButton || disabled()) {
        return;
      }

      pointerTypeRef = event.pointerType as 'mouse' | 'touch' | 'pen' | '';
      ignoreClickRef = false;
      params.isPressedRef.current = true;
      incrementDownCoordsRef = { x: event.clientX, y: event.clientY };

      commitValue(event);

      const isTouchPointer = isTouchLikePointerType(event.pointerType);

      // Note: "pen" is sometimes returned for mouse usage on Linux Chrome.
      if (!isTouchPointer) {
        event.preventDefault();
        params.inputRef.current?.focus();
        params.startAutoChange(isIncrement(), event);
      } else {
        // We need to check if the pointerdown was intentional, and not the result of a scroll
        // or pinch-zoom. In that case, we don't want to change the value.
        params.intentionalTouchCheckTimeout.start(TOUCH_TIMEOUT, () => {
          const moves = params.movesAfterTouchRef.current;
          params.movesAfterTouchRef.current = 0;
          // Only start auto-change if the touch is still pressed (prevents races
          // with pointerup occurring before the timeout fires on quick taps).
          const stillPressed = params.isPressedRef.current;
          if (stillPressed && moves != null && moves < MAX_POINTER_MOVES_AFTER_TOUCH) {
            params.startAutoChange(isIncrement(), event);
            ignoreClickRef = true; // synthesized click should be ignored
          } else {
            // No auto-change (simple tap or scroll gesture), allow the click handler
            // to perform a single increment and commit.
            ignoreClickRef = false;
            params.stopAutoChange();
          }
        });
      }
    },
    onPointerUp(event) {
      // Ensure we mark the press as released for touch flows even if auto-change never started,
      // so the delayed auto-change check won’t start after a quick tap.
      if (isTouchLikePointerType(event.pointerType)) {
        params.isPressedRef.current = false;
      }
    },
    onPointerMove(event) {
      const isDisabled = disabled() || readOnly();
      if (
        isDisabled ||
        !isTouchLikePointerType(event.pointerType) ||
        !params.isPressedRef.current
      ) {
        return;
      }

      if (params.movesAfterTouchRef.current != null) {
        params.movesAfterTouchRef.current += 1;
      }

      const { x, y } = incrementDownCoordsRef;
      const dx = x - event.clientX;
      const dy = y - event.clientY;

      // An alternative to this technique is to detect when the NumberField's parent container
      // has been scrolled
      if (dx ** 2 + dy ** 2 > SCROLLING_POINTER_MOVE_DISTANCE ** 2) {
        params.stopAutoChange();
      }
    },
    onMouseEnter(event) {
      const isDisabled = disabled() || readOnly();
      if (
        event.defaultPrevented ||
        isDisabled ||
        !params.isPressedRef.current ||
        isTouchingButtonRef ||
        isTouchLikePointerType(pointerTypeRef)
      ) {
        return;
      }

      params.startAutoChange(isIncrement(), event);
    },
    onMouseLeave() {
      if (isTouchingButtonRef) {
        return;
      }

      params.stopAutoChange();
    },
    onMouseUp() {
      if (isTouchingButtonRef) {
        return;
      }

      params.stopAutoChange();
    },
  };

  return { props };
}

export interface UseNumberFieldButtonParameters {
  inputRef: ReactLikeRef<HTMLInputElement | null | undefined>;
  allowInputSyncRef: ReactLikeRef<boolean | null>;
  formatOptionsRef: ReactLikeRef<Intl.NumberFormatOptions | undefined>;
  valueRef: ReactLikeRef<number | null>;
  isPressedRef: ReactLikeRef<boolean | null>;
  movesAfterTouchRef: ReactLikeRef<number | null>;
  lastChangedValueRef: ReactLikeRef<number | null>;
  disabled: MaybeAccessor<boolean>;
  getStepAmount: (event?: EventWithOptionalKeyState) => number | undefined;
  id: MaybeAccessor<string | undefined>;
  incrementValue: (amount: number, params: IncrementValueParameters) => boolean;
  inputValue: MaybeAccessor<string>;
  intentionalTouchCheckTimeout: Timeout;
  isIncrement: MaybeAccessor<boolean>;
  locale?: MaybeAccessor<Intl.LocalesArgument | undefined>;
  readOnly: MaybeAccessor<boolean>;
  setValue: (value: number | null, details: NumberFieldRoot.ChangeEventDetails) => boolean;
  startAutoChange: (isIncrement: boolean, event?: MouseEvent | Event) => void;
  stopAutoChange: () => void;
  onValueCommitted: (
    value: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) => void;
}

export interface UseNumberFieldButtonReturnValue {
  props: HTMLProps;
}

export namespace useNumberFieldButton {
  export type Parameters = UseNumberFieldButtonParameters;
  export type ReturnValue = UseNumberFieldButtonReturnValue;
}
