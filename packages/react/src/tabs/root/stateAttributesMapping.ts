import type { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import type { TabsRoot } from './TabsRoot';
import { TabsRootDataAttributes } from './TabsRootDataAttributes';

export const tabsStateAttributesMapping: StateAttributesMapping<TabsRoot.State> = {
  tabActivationDirection: (dir) => ({
    [TabsRootDataAttributes.activationDirection]: dir,
  }),
};
