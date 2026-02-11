import { createEffect } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';

/**
 * A link that opens the preview card.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardTrigger(componentProps: PreviewCardTrigger.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['delay', 'closeDelay']);

  const { open, triggerProps, setTriggerElement, writeDelayRefs } = usePreviewCardRootContext();

  createEffect(() => {
    writeDelayRefs({ delay: local.delay, closeDelay: local.closeDelay });
  });

  const state: PreviewCardTrigger.State = {
    get open() {
      return open();
    },
  };

  const element = useRenderElement('a', componentProps, {
    state,
    ref: setTriggerElement,
    props: [triggerProps, elementProps],
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{element()}</>;
}

export interface PreviewCardTriggerState {
  /**
   * Whether the preview card is currently open.
   */
  open: boolean;
}

export interface PreviewCardTriggerProps extends BaseUIComponentProps<
  'a',
  PreviewCardTrigger.State
> {
  /**
   * How long to wait before the preview card opens. Specified in milliseconds.
   * @default 600
   */
  delay?: number;
  /**
   * How long to wait before closing the preview card. Specified in milliseconds.
   * @default 300
   */
  closeDelay?: number;
}

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props = PreviewCardTriggerProps;
}
