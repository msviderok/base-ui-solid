import type { BaseUIComponentProps } from '../../utils/types';
import { SelectScrollArrow } from '../scroll-arrow/SelectScrollArrow';

/**
 * An element that scrolls the select popup up when hovered. Does not render when using touch input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectScrollUpArrow(props: SelectScrollUpArrow.Props) {
  return <SelectScrollArrow {...props} ref={props.ref} direction="up" />;
}

export interface SelectScrollUpArrowState {}

export interface SelectScrollUpArrowProps extends BaseUIComponentProps<
  'div',
  SelectScrollUpArrow.State
> {
  /**
   * Whether to keep the HTML element in the DOM while the select popup is not scrollable.
   * @default false
   */
  keepMounted?: boolean;
}

export namespace SelectScrollUpArrow {
  export type State = SelectScrollUpArrowState;
  export type Props = SelectScrollUpArrowProps;
}
