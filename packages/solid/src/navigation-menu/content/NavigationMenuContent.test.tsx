import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Content />', () => {
  const { render } = createRenderer();

  describeConformance.skip(NavigationMenu.Content, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) =>
      render(() => (
        <NavigationMenu.Root value="test">
          <NavigationMenu.Item>{node(props!)}</NavigationMenu.Item>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner>
              <NavigationMenu.Popup>
                <NavigationMenu.Viewport />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Root>
      )),
  }));
});
