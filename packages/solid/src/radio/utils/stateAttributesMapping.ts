import { fieldValidityMapping } from '../../field/utils/constants';
import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { transitionStatusMapping } from '../../utils/stateAttributesMapping';
import type { TransitionStatus } from '../../utils/useTransitionStatus';
import { RadioRootDataAttributes } from '../root/RadioRootDataAttributes';

export const stateAttributesMapping = {
  checked(value): Record<string, string> {
    if (value) {
      return { [RadioRootDataAttributes.checked]: '' };
    }
    return { [RadioRootDataAttributes.unchecked]: '' };
  },
  ...transitionStatusMapping,
  ...fieldValidityMapping,
} satisfies StateAttributesMapping<{
  checked: boolean;
  transitionStatus: TransitionStatus;
  valid: boolean | null;
}>;
