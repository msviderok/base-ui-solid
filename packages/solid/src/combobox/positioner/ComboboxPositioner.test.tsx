import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';

describe('<Combobox.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Positioner, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Combobox.Root open>
          <Combobox.Portal>{node(props!)}</Combobox.Portal>
        </Combobox.Root>
      ));
    },
  }));
});
