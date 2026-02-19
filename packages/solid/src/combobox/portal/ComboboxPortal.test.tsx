import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';

describe('<Combobox.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Combobox.Root open>{node(props!)}</Combobox.Root>);
    },
  }));
});
