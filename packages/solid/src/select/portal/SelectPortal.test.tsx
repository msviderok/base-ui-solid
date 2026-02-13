import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Select.Root open>
          <Select.Portal>{node(props!)}</Select.Portal>
        </Select.Root>
      ));
    },
  }));
});
