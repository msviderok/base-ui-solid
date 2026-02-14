import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Popup, () => ({
    refInstanceof: window.HTMLElement,
    render: (node, props) =>
      render(() => (
        <NavigationMenu.Root value="test">
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner>{node(props!)}</NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Root>
      )),
  }));
});
