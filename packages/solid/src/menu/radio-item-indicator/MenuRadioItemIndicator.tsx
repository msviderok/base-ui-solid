import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useMenuRadioItemContext } from '../radio-item/MenuRadioItemContext';
import { itemMapping } from '../utils/stateAttributesMapping';

/**
 * Indicates whether the radio item is selected.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRadioItemIndicator(componentProps: MenuRadioItemIndicator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const item = useMenuRadioItemContext();

  let indicatorRef = null as HTMLSpanElement | null | undefined;

  const { transitionStatus, setMounted } = useTransitionStatus(item.checked);

  useOpenChangeComplete({
    open: item.checked,
    ref: () => indicatorRef,
    onComplete() {
      if (!item.checked()) {
        setMounted(false);
      }
    },
  });

  const state: MenuRadioItemIndicator.State = {
    get checked() {
      return item.checked();
    },
    get disabled() {
      return item.disabled();
    },
    get highlighted() {
      return item.highlighted();
    },
    get transitionStatus() {
      return transitionStatus();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: (el) => {
      indicatorRef = el;
    },
    stateAttributesMapping: itemMapping,
    enabled: () => keepMounted() || item.checked(),
    props: [{ 'aria-hidden': true }, elementProps],
  });

  return <>{element()}</>;
}

export interface MenuRadioItemIndicatorProps extends BaseUIComponentProps<
  'span',
  MenuRadioItemIndicator.State
> {
  /**
   * Whether to keep the HTML element in the DOM when the radio item is inactive.
   * @default false
   */
  keepMounted?: boolean;
}

export interface MenuRadioItemIndicatorState {
  /**
   * Whether the radio item is currently selected.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  highlighted: boolean;
  transitionStatus: TransitionStatus;
}

export namespace MenuRadioItemIndicator {
  export type Props = MenuRadioItemIndicatorProps;
  export type State = MenuRadioItemIndicatorState;
}
