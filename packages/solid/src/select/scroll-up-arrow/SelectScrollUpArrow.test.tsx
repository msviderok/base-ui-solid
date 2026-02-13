import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';

describe('<Select.ScrollUpArrow />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props: any) => <Select.ScrollUpArrow {...props} ref={props.ref} keepMounted />,
    () => ({
      refInstanceof: window.HTMLDivElement,
      render(node, props) {
        return render(() => (
          <Select.Root open>
            <Select.Positioner>{node(props!)}</Select.Positioner>
          </Select.Root>
        ));
      },
    }),
  );
});
