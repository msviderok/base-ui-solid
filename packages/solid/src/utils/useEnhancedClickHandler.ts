export type InteractionType = 'mouse' | 'touch' | 'pen' | 'keyboard' | '';

/**
 * Provides a cross-browser way to determine the type of the pointer used to click.
 * Safari and Firefox do not provide the PointerEvent to the click handler (they use MouseEvent) yet.
 * Additionally, this implementation detects if the click was triggered by the keyboard.
 *
 * @param handler The function to be called when the button is clicked. The first parameter is the original event and the second parameter is the pointer type.
 */
export function useEnhancedClickHandler(
  handler: (event: MouseEvent | PointerEvent, interactionType: InteractionType) => void,
) {
  let lastClickInteractionTypeRef: InteractionType = '';

  const handlePointerDown = (event: PointerEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    lastClickInteractionTypeRef = event.pointerType as InteractionType;
    handler(event, event.pointerType as InteractionType);
  };

  const handleClick = (event: MouseEvent | PointerEvent) => {
    // event.detail has the number of clicks performed on the element. 0 means it was triggered by the keyboard.
    if (event.detail === 0) {
      handler(event, 'keyboard');
      return;
    }

    if ('pointerType' in event) {
      // Chrome and Edge correctly use PointerEvent
      handler(event, event.pointerType as InteractionType);
    }

    handler(event, lastClickInteractionTypeRef);
    lastClickInteractionTypeRef = '';
  };

  return { onClick: handleClick, onPointerDown: handlePointerDown };
}
