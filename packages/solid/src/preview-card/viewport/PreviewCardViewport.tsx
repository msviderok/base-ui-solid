import type { JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { usePopupViewport } from '../../utils/usePopupViewport';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import { PreviewCardViewportCssVars } from './PreviewCardViewportCssVars';

const stateAttributesMapping: StateAttributesMapping<PreviewCardViewport.State> = {
  activationDirection: (value) =>
    value
      ? {
          'data-activation-direction': value,
        }
      : null,
};

/**
 * A viewport for displaying content transitions.
 * This component is only required if one popup can be opened by multiple triggers, its content change based on the trigger
 * and switching between them is animated.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardViewport(componentProps: PreviewCardViewport.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);
  const { store } = usePreviewCardRootContext();
  const { side } = usePreviewCardPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    get store() {
      return store;
    },
    get side() {
      return side();
    },
    cssVars: PreviewCardViewportCssVars,
    get children() {
      return local.children;
    },
  });

  const state: PreviewCardViewport.State = {
    get activationDirection() {
      return viewportState.activationDirection;
    },
    get transitioning() {
      return viewportState.transitioning;
    },
    get instant() {
      return instantType();
    },
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    get children() {
      return childrenToRender;
    },
    stateAttributesMapping,
  });

  return <>{element()}</>;
}

export namespace PreviewCardViewport {
  export interface Props extends BaseUIComponentProps<'div', State> {
    /**
     * The content to render inside the transition container.
     */
    children?: JSX.Element;
  }

  export interface State {
    activationDirection: string | undefined;
    /**
     * Whether the viewport is currently transitioning between contents.
     */
    transitioning: boolean;
    instant: 'dismiss' | 'focus' | undefined;
  }
}
