import { Field } from '../field';
import type { BaseUIComponentProps } from '../utils/types';

/**
 * A native input element that automatically works with [Field](https://base-ui.com/react/components/field).
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export function Input(props: Input.Props) {
  return <Field.Control {...props} />;
}

export interface InputProps extends BaseUIComponentProps<'input', Input.State> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: Field.Control.Props['onValueChange'];
  defaultValue?: Field.Control.Props['defaultValue'];
}

export interface InputState extends Field.Control.State {}

export type InputChangeEventReason = Field.Control.ChangeEventReason;
export type InputChangeEventDetails = Field.Control.ChangeEventDetails;

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}
