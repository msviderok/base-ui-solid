import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.Backdrop />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Backdrop, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Select.Root open>{node(props!)}</Select.Root>);
    },
  }));
});
