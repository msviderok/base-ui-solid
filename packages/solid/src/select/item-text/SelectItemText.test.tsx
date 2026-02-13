import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.ItemText />', () => {
  const { render } = createRenderer();

  describeConformance(Select.ItemText, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Select.Root open>
          <Select.Positioner>
            <Select.Item value="">{node(props!)}</Select.Item>
          </Select.Positioner>
        </Select.Root>
      ));
    },
  }));
});
