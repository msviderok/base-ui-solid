import { createRenderer, describeConformance } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';

describe('<Menu.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Menu.Portal {...props} keepMounted ref={props.ref} />,
    () => ({
      refInstanceof: window.HTMLDivElement,
      render(node, props) {
        return render(() => <Menu.Root>{node(props!)}</Menu.Root>);
      },
    }),
  );
});
