import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Item />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Item, () => ({
    refInstanceof: window.HTMLLIElement,
    render: (node, props) =>
      render(() => <NavigationMenu.Root>{node(props!)}</NavigationMenu.Root>),
  }));
});
