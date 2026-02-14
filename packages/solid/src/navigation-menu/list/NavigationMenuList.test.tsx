import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.List />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.List, () => ({
    refInstanceof: window.HTMLUListElement,
    render: (node, props) =>
      render(() => <NavigationMenu.Root>{node(props!)}</NavigationMenu.Root>),
  }));
});
