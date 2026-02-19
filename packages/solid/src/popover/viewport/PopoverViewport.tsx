import { JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { usePopupViewport } from '../../utils/usePopupViewport';
import { useRenderElement } from '../../utils/useRenderElement';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverViewportCssVars } from './PopoverViewportCssVars';

const stateAttributesMapping: StateAttributesMapping<PopoverViewport.State> = {
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
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverViewport(componentProps: PopoverViewport.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);
  const { store } = usePopoverRootContext();
  const { side } = usePopoverPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    store,
    get side() {
      return side();
    },
    cssVars: PopoverViewportCssVars,
    get children() {
      return local.children;
    },
  });

  const state: PopoverViewport.State = {
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

export namespace PopoverViewport {
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
    /**
     * Present if animations should be instant.
     */
    instant: 'dismiss' | 'click' | undefined;
  }
}
