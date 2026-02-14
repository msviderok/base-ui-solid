import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Icon />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Icon, () => ({
    refInstanceof: window.HTMLSpanElement,
    render: (node, props) =>
      render(() => (
        <NavigationMenu.Root>
          <NavigationMenu.Item>{node(props!)}</NavigationMenu.Item>
        </NavigationMenu.Root>
      )),
  }));
});
