import { type JSX, Show } from 'solid-js';
import { splitComponentProps } from '../../solid-helpers';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useSelectItemContext } from '../item/SelectItemContext';

/**
 * Indicates whether the select item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItemIndicator(componentProps: SelectItemIndicator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { selected } = useSelectItemContext();

  let indicatorRef = null as HTMLSpanElement | null | undefined;

  const { transitionStatus, setMounted } = useTransitionStatus(selected);

  const state: SelectItemIndicator.State = {
    get selected() {
      return selected();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  useOpenChangeComplete({
    open: selected,
    ref: () => indicatorRef,
    onComplete() {
      if (!selected()) {
        setMounted(false);
      }
    },
  });

  const shouldRender = () => keepMounted() || selected();

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      indicatorRef = el;
    },
    props: [{ 'aria-hidden': true }, elementProps],
    stateAttributesMapping: transitionStatusMapping,
    get children() {
      return <>{componentProps.children ?? '✔️'}</>;
    },
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface SelectItemIndicatorState {
  selected: boolean;
  transitionStatus: TransitionStatus;
}

export interface SelectItemIndicatorProps extends BaseUIComponentProps<
  'span',
  SelectItemIndicator.State
> {
  children?: JSX.Element;
  /** Whether to keep the HTML element in the DOM when the item is not selected. */
  keepMounted?: boolean | undefined;
}

export namespace SelectItemIndicator {
  export type State = SelectItemIndicatorState;
  export type Props = SelectItemIndicatorProps;
}
