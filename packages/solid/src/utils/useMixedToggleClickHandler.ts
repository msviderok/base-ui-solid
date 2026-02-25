import { ownerDocument } from '@base-ui/utils/owner';
import { createMemo } from 'solid-js';
import { access, type MaybeAccessor } from '../solid-helpers';
import { EMPTY_OBJECT } from './constants';
import { BaseUIEvent } from './types';

/**
 * Returns `click` and `mousedown` handlers that fix the behavior of triggers of popups that are toggled by different events.
 * For example, a button that opens a popup on mousedown and closes it on click.
 * This hook prevents the popup from closing immediately after the mouse button is released.
 */
export function useMixedToggleClickHandler(params: useMixedToggleClickHandler.Parameters) {
  const enabled = () => access(params.enabled) ?? true;
  const mouseDownAction = () => access(params.mouseDownAction);
  const open = () => access(params.open);

  let ignoreClickRef = false;
  const result = createMemo(
    (): {
      onMouseDown?: (event: MouseEvent) => void;
      onClick?: (event: BaseUIEvent<MouseEvent>) => void;
    } => {
      if (!enabled()) {
        return EMPTY_OBJECT;
      }

      return {
        onMouseDown: (event) => {
          if (
            (mouseDownAction() === 'open' && !open()) ||
            (mouseDownAction() === 'close' && open())
          ) {
            ignoreClickRef = true;

            ownerDocument(event.currentTarget as Element).addEventListener(
              'click',
              () => {
                ignoreClickRef = false;
              },
              { once: true },
            );
          }
        },
        onClick: (event) => {
          if (ignoreClickRef) {
            ignoreClickRef = false;
            event.preventBaseUIHandler();
          }
        },
      };
    },
  );

  return result;
}

export interface UseMixedToggleClickHandlerParameters {
  /**
   * Whether the mixed toggle click handler is enabled.
   * @default true
   */
  enabled?: MaybeAccessor<boolean | undefined>;
  /**
   * Determines what action is performed on mousedown.
   */
  mouseDownAction: MaybeAccessor<'open' | 'close'>;
  /**
   * The current open state of the popup.
   */
  open: MaybeAccessor<boolean>;
}

export namespace useMixedToggleClickHandler {
  export type Parameters = UseMixedToggleClickHandlerParameters;
}
