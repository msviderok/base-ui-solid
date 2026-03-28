import { isIOS } from '@base-ui/utils/detectBrowser';
import { createSignal } from 'solid-js';
import { access, type MaybeAccessor } from '../solid-helpers';
import { InteractionType, useEnhancedClickHandler } from './useEnhancedClickHandler';

/**
 * Determines the interaction type (keyboard, mouse, touch, etc.) that opened the component.
 *
 * @param open The open state of the component.
 */
export function useOpenInteractionType(open: MaybeAccessor<boolean>) {
  const [openMethod, setOpenMethod] = createSignal<InteractionType | null>(null);

  function handleTriggerClick(_: MouseEvent, interactionType: InteractionType) {
    if (!access(open)) {
      setOpenMethod(
        interactionType ||
          // On iOS Safari, the hitslop around touch targets means tapping outside an element's
          // bounds does not fire `pointerdown` but does fire `mousedown`. The `interactionType`
          // will be "" in that case.
          (isIOS ? 'touch' : ''),
      );
    }
  }

  function reset() {
    setOpenMethod(null);
  }

  const { onClick, onPointerDown } = useEnhancedClickHandler(handleTriggerClick);

  return {
    openMethod,
    reset,
    triggerProps: {
      onClick,
      onPointerDown,
    },
  };
}
