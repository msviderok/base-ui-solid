import { Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import type { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useRadioRootContext } from '../root/RadioRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * Indicates whether the radio button is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Radio](https://base-ui.com/react/components/radio)
 */
export function RadioIndicator(componentProps: RadioIndicator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const rootState = useRadioRootContext();

  const rendered = () => rootState.checked();

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered());

  const state: RadioIndicator.State = {
    // @ts-expect-error - disabled is not a valid property for the state
    get disabled() {
      return rootState.disabled();
    },
    get touched() {
      return rootState.touched();
    },
    get dirty() {
      return rootState.dirty();
    },
    get valid() {
      return rootState.valid();
    },
    get filled() {
      return rootState.filled();
    },
    get focused() {
      return rootState.focused();
    },
    get readOnly() {
      return rootState.readOnly();
    },
    get checked() {
      return rootState.checked();
    },
    get required() {
      return rootState.required();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  let indicatorRef = null as HTMLSpanElement | null | undefined;

  const shouldRender = () => keepMounted() || mounted();

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      indicatorRef = el;
    },
    props: elementProps,
    stateAttributesMapping,
  });

  useOpenChangeComplete({
    open: rendered,
    ref: indicatorRef,
    onComplete() {
      if (!rendered()) {
        setMounted(false);
      }
    },
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface RadioIndicatorProps extends BaseUIComponentProps<'span', RadioIndicator.State> {
  /**
   * Whether to keep the HTML element in the DOM when the radio button is inactive.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface RadioIndicatorState {
  /**
   * Whether the radio button is currently selected.
   */
  checked: boolean;
  transitionStatus: TransitionStatus;
}

export namespace RadioIndicator {
  export type Props = RadioIndicatorProps;
  export type State = RadioIndicatorState;
}
