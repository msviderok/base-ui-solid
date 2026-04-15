import { createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { splitComponentProps } from '../../solid-helpers';
import { isWebKit } from '../../utils/detectBrowser';
import { ownerDocument } from '../../utils/owner';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import type { NumberFieldRoot } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { useNumberFieldScrubAreaContext } from '../scrub-area/NumberFieldScrubAreaContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A custom element to display instead of the native cursor while using the scrub area.
 * Renders a `<span>` element.
 *
 * This component uses the [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API), which may prompt the browser to display a related notification. It is disabled
 * in Safari to avoid a layout shift that this notification causes there.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubAreaCursor(componentProps: NumberFieldScrubAreaCursor.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const { state } = useNumberFieldRootContext();
  const { isScrubbing, isTouchInput, isPointerLockDenied, scrubAreaCursorRef } =
    useNumberFieldScrubAreaContext();

  const [domElement, setDomElement] = createSignal<Element | null | undefined>(null);

  const shouldRender = () =>
    isScrubbing() && !isWebKit && !isTouchInput() && !isPointerLockDenied();

  const element = useRenderElement('span', componentProps, {
    enabled: shouldRender,
    state,
    ref: (el) => {
      scrubAreaCursorRef.current = el;
      setDomElement(el);
    },
    props: [
      {
        role: 'presentation',
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          'pointer-events': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
  });

  return <Portal mount={ownerDocument(domElement() ?? null).body}>{element()}</Portal>;
}

export interface NumberFieldScrubAreaCursorState extends NumberFieldRoot.State {}

export interface NumberFieldScrubAreaCursorProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubAreaCursor.State
> {}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
  export type Props = NumberFieldScrubAreaCursorProps;
}
