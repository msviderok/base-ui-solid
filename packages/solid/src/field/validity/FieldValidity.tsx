import { createMemo, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { FieldValidityData } from '../root/FieldRoot';
import { useFieldRootContext } from '../root/FieldRootContext';
import { getCombinedFieldValidityData } from '../utils/getCombinedFieldValidityData';

/**
 * Used to display a custom message based on the field’s validity.
 * Requires `children` to be a function that accepts field validity state as an argument.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldValidity(props: FieldValidity.Props) {
  const { validityData, invalid } = useFieldRootContext(false);

  const fieldValidityState = createMemo<FieldValidity.State>(() => {
    const combinedFieldValidityData = getCombinedFieldValidityData(validityData, invalid());
    return {
      ...combinedFieldValidityData,
      validity: combinedFieldValidityData.state,
    };
  });

  return <Dynamic component={props.children} {...fieldValidityState()} />;
}

export interface FieldValidityState extends Omit<FieldValidityData, 'state'> {
  validity: FieldValidityData['state'];
}

export interface FieldValidityProps {
  /**
   * A function that accepts the field validity state as an argument.
   *
   * ```jsx
   * <Field.Validity>
   *   {(validity) => {
   *     return <div>...</div>
   *   }}
   * </Field.Validity>
   * ```
   */
  children: (state: FieldValidity.State) => JSX.Element;
}

export namespace FieldValidity {
  export type State = FieldValidityState;
  export type Props = FieldValidityProps;
}
