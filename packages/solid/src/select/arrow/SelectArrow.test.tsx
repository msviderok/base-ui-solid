import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Arrow, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Select.Root open>
          <Select.Positioner alignItemWithTrigger={false}>{node(props!)}</Select.Positioner>
        </Select.Root>
      ));
    },
  }));
});
