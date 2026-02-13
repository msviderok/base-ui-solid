import type { BaseUIComponentProps } from '../../utils/types';
import { SelectScrollArrow } from '../scroll-arrow/SelectScrollArrow';

/**
 * An element that scrolls the select popup down when hovered. Does not render when using touch input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectScrollDownArrow(props: SelectScrollDownArrow.Props) {
  return <SelectScrollArrow {...props} ref={props.ref} direction="down" />;
}

export interface SelectScrollDownArrowState {}

export interface SelectScrollDownArrowProps extends BaseUIComponentProps<
  'div',
  SelectScrollDownArrow.State
> {
  /**
   * Whether to keep the HTML element in the DOM while the select popup is not scrollable.
   * @default false
   */
  keepMounted?: boolean;
}

export namespace SelectScrollDownArrow {
  export type State = SelectScrollDownArrowState;
  export type Props = SelectScrollDownArrowProps;
}
