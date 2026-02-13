import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.Icon />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Icon, () => ({
    refInstanceof: window.HTMLSpanElement,
    render(node, props) {
      return render(() => <Select.Root open>{node(props!)}</Select.Root>);
    },
  }));
});
