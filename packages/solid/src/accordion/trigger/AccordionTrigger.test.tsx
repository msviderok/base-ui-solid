import { createRenderer, describeConformance } from '#test-utils';
import { Accordion } from '@msviderok/base-ui-solid/accordion';

describe('<Accordion.Trigger />', () => {
  const { render } = createRenderer();

  describeConformance(Accordion.Trigger, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,
    render: (node, props) =>
      render(() => (
        <Accordion.Root>
          <Accordion.Item>{node(props!)}</Accordion.Item>
        </Accordion.Root>
      )),
  }));
});
