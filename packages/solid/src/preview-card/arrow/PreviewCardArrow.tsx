import { splitComponentProps } from '../../solid-helpers';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import type { Align, Side } from '../../utils/useAnchorPositioning';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';

/**
 * Displays an element positioned against the preview card anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardArrow(componentProps: PreviewCardArrow.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, []);

  const store = usePreviewCardRootContext();
  const { refs, side, align, arrowUncentered, arrowStyles } = usePreviewCardPositionerContext();
  const open = store.useState('open');

  const state: PreviewCardArrow.State = {
    get open() {
      return open();
    },
    get side() {
      return side();
    },
    get align() {
      return align();
    },
    get uncentered() {
      return arrowUncentered();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: refs.setArrowRef,
    props: [
      {
        get style() {
          return arrowStyles();
        },
        'aria-hidden': true,
      },
      elementProps,
    ],
    stateAttributesMapping: popupStateMapping,
  });

  return <>{element()}</>;
}

export interface PreviewCardArrowState {
  /**
   * Whether the preview card is currently open.
   */
  open: boolean;
  side: Side;
  align: Align;
  uncentered: boolean;
}

export interface PreviewCardArrowProps extends BaseUIComponentProps<
  'div',
  PreviewCardArrow.State
> {}

export namespace PreviewCardArrow {
  export type State = PreviewCardArrowState;
  export type Props = PreviewCardArrowProps;
}
