import { Show, type JSX } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTransitionStatus, type TransitionStatus } from '../../utils/useTransitionStatus';
import { useComboboxItemContext } from '../item/ComboboxItemContext';

/**
 * Indicates whether the item is selected.
 * Renders a `<span>` element.
 */
export function ComboboxItemIndicator(componentProps: ComboboxItemIndicator.Props) {
  const keepMounted = () => componentProps.keepMounted ?? false;

  const { selected } = useComboboxItemContext();

  const shouldRender = () => keepMounted() || selected();

  return (
    <Show when={shouldRender()}>
      <Inner {...componentProps} />
    </Show>
  );
}

/** The core implementation of the indicator is split here to avoid paying the hooks
 * costs unless the element needs to be mounted. */
function Inner(componentProps: ComboboxItemIndicator.Props) {
  const [, , elementProps] = splitComponentProps(componentProps, ['keepMounted']);

  const { selected } = useComboboxItemContext();

  let indicatorRef = null as HTMLSpanElement | null | undefined;

  const { transitionStatus, setMounted } = useTransitionStatus(selected);

  const state: ComboboxItemIndicator.State = {
    get selected() {
      return selected();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const element = useRenderElement('span', componentProps, {
    ref: (el) => {
      indicatorRef = el;
    },
    state,
    props: [
      {
        'aria-hidden': true,
        children: '✔️',
      },
      elementProps,
    ],
    stateAttributesMapping: transitionStatusMapping,
  });

  useOpenChangeComplete({
    open: selected,
    ref: indicatorRef,
    onComplete() {
      if (!selected()) {
        setMounted(false);
      }
    },
  });

  return <>{element()}</>;
}

export interface ComboboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  ComboboxItemIndicator.State
> {
  children?: JSX.Element;
  /**
   * Whether to keep the HTML element in the DOM when the item is not selected.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface ComboboxItemIndicatorState {
  selected: boolean;
  transitionStatus: TransitionStatus;
}

export namespace ComboboxItemIndicator {
  export type Props = ComboboxItemIndicatorProps;
  export type State = ComboboxItemIndicatorState;
}
