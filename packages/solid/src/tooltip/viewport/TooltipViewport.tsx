import type { JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { BaseUIComponentProps } from '../../utils/types';
import { usePopupViewport } from '../../utils/usePopupViewport';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipViewportCssVars } from './TooltipViewportCssVars';

const stateAttributesMapping: StateAttributesMapping<TooltipViewport.State> = {
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
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipViewport(componentProps: TooltipViewport.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['children']);
  const { store } = useTooltipRootContext();
  const positioner = useTooltipPositionerContext();

  const instantType = store.useState('instantType');

  const { children: childrenToRender, state: viewportState } = usePopupViewport({
    get store() {
      return store;
    },
    get side() {
      return positioner.side();
    },
    cssVars: TooltipViewportCssVars,
    get children() {
      return local.children;
    },
  });

  const state: TooltipViewport.State = {
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
    stateAttributesMapping,
    get children() {
      return childrenToRender;
    },
  });

  return <>{element()}</>;
}

export namespace TooltipViewport {
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
    instant: 'delay' | 'dismiss' | 'focus' | undefined;
  }
}
