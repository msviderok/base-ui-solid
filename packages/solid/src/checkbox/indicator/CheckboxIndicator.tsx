import { Show, mergeProps as solidMergeProps, splitProps } from 'solid-js';
import { fieldValidityMapping } from '../../field/utils/constants';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { type TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import type { CheckboxRoot } from '../root/CheckboxRoot';
import { useCheckboxRootContext } from '../root/CheckboxRootContext';
import { useStateAttributesMapping } from '../utils/useStateAttributesMapping';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui.com/react/components/checkbox)
 */
export function CheckboxIndicator(componentProps: CheckboxIndicator.Props) {
  const [local, elementProps] = splitProps(componentProps, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const { state: rootState } = useCheckboxRootContext();

  const rendered = () => rootState.checked || rootState.indeterminate;

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  let indicatorRef = null as HTMLSpanElement | null | undefined;

  useOpenChangeComplete({
    open: rendered,
    ref: () => indicatorRef,
    onComplete() {
      if (!rendered()) {
        setMounted(false);
      }
    },
  });

  const baseStateAttributesMapping = useStateAttributesMapping(rootState);

  const stateAttributesMapping: StateAttributesMapping<CheckboxIndicator.State> = {
    ...baseStateAttributesMapping,
    ...transitionStatusMapping,
    ...fieldValidityMapping,
  };

  const shouldRender = () => keepMounted() || mounted();

  const indicatorState: CheckboxIndicator.State = solidMergeProps(rootState, {
    get transitionStatus() {
      return transitionStatus();
    },
  });

  const element = useRenderElement('span', componentProps, {
    state: indicatorState,
    ref: (el) => {
      indicatorRef = el;
    },
    get stateAttributesMapping() {
      return stateAttributesMapping;
    },
    props: elementProps,
  });

  return <Show when={shouldRender()}>{element()}</Show>;
}

export interface CheckboxIndicatorState extends CheckboxRoot.State {
  transitionStatus: TransitionStatus;
}

export interface CheckboxIndicatorProps extends BaseUIComponentProps<
  'span',
  CheckboxIndicator.State
> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CheckboxIndicator {
  export type State = CheckboxIndicatorState;
  export type Props = CheckboxIndicatorProps;
}
