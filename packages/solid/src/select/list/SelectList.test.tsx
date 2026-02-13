import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.List />', () => {
  const { render } = createRenderer();

  describeConformance(Select.List, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Select.Root open>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>{node(props!)}</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));
    },
  }));
});
