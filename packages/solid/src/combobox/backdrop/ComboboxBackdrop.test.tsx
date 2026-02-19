import { createRenderer, describeConformance } from '#test-utils';
import { Combobox } from '@msviderok/base-ui-solid/combobox';

describe('<Combobox.Backdrop />', () => {
  const { render } = createRenderer();

  describeConformance(Combobox.Backdrop, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Combobox.Root defaultOpen>
          <Combobox.Portal>{node(props!)}</Combobox.Portal>
        </Combobox.Root>
      ));
    },
  }));
});
