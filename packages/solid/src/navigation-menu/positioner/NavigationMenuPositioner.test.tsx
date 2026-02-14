import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Positioner, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) =>
      render(() => (
        <NavigationMenu.Root value="test">
          <NavigationMenu.Portal>{node(props!)}</NavigationMenu.Portal>
        </NavigationMenu.Root>
      )),
  }));
});
