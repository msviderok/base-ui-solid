import { createRenderer, describeConformance } from '#test-utils';
import { NavigationMenu } from '@msviderok/base-ui-solid/navigation-menu';

describe('<NavigationMenu.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <NavigationMenu.Root value="item">{node(props!)}</NavigationMenu.Root>);
    },
  }));
});
