import { fieldValidityMapping } from '../../field/utils/constants';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import type { CheckboxRoot } from '../root/CheckboxRoot';
import { CheckboxRootDataAttributes } from '../root/CheckboxRootDataAttributes';

export function useStateAttributesMapping(
  state: CheckboxRoot.State,
): StateAttributesMapping<typeof state> {
  return {
    checked(value): Record<string, string> {
      if (state.indeterminate) {
        // `data-indeterminate` is already handled by the `indeterminate` prop.
        return {};
      }

      if (value) {
        return {
          [CheckboxRootDataAttributes.checked]: '',
        };
      }

      return {
        [CheckboxRootDataAttributes.unchecked]: '',
      };
    },
    ...fieldValidityMapping,
  };
}
