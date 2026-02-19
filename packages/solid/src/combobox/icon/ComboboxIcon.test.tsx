import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';

describe('<Combobox.Icon />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Icon, () => ({
    refInstanceof: window.HTMLSpanElement,
    render(node, props) {
      return render(() => <Combobox.Root open>{node(props!)}</Combobox.Root>);
    },
  }));
});
