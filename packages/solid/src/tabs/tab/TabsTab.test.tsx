import { createRenderer, describeConformance } from '#test-utils';
import { Tabs } from '@msviderok/base-ui-solid/tabs';

describe('<Tabs.Tab />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Tabs.Tab {...props} ref={props.ref} value="1" />,
    () => ({
      refInstanceof: window.HTMLButtonElement,
      testComponentPropWith: 'button',
      button: true,
      render: (node, props) => {
        return render(() => (
          <Tabs.Root>
            <Tabs.List>{node(props!)}</Tabs.List>
          </Tabs.Root>
        ));
      },
    }),
  );
});
