import { createRenderer, describeConformance } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';

describe('<Menu.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Menu.Arrow, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) =>
      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>{node(props!)}</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )),
  }));
});
