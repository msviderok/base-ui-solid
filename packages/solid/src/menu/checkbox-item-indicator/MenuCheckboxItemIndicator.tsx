import { splitComponentProps } from '../../solid-helpers';
import { BaseUIComponentProps } from '../../utils/types';
import { useOpenChangeComplete } from '../../utils/useOpenChangeComplete';
import { useRenderElement } from '../../utils/useRenderElement';
import { TransitionStatus, useTransitionStatus } from '../../utils/useTransitionStatus';
import { useMenuCheckboxItemContext } from '../checkbox-item/MenuCheckboxItemContext';
import { itemMapping } from '../utils/stateAttributesMapping';

/**
 * Indicates whether the checkbox item is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuCheckboxItemIndicator(componentProps: MenuCheckboxItemIndicator.Props) {
  const [, local, elementProps] = splitComponentProps(componentProps, ['keepMounted']);
  const keepMounted = () => local.keepMounted ?? false;

  const item = useMenuCheckboxItemContext();

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

  const state: MenuCheckboxItemIndicator.State = {
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
    props: [{ 'aria-hidden': true }, elementProps],
    enabled: () => keepMounted() || item.checked(),
  });

  return <>{element()}</>;
}

export interface MenuCheckboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  MenuCheckboxItemIndicator.State
> {
  /**
   * Whether to keep the HTML element in the DOM when the checkbox item is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface MenuCheckboxItemIndicatorState {
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  highlighted: boolean;
  transitionStatus: TransitionStatus;
}

export namespace MenuCheckboxItemIndicator {
  export type Props = MenuCheckboxItemIndicatorProps;
  export type State = MenuCheckboxItemIndicatorState;
}
