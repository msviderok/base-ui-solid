import { createRenderer, describeConformance } from '#test-utils';
import { Accordion } from '@msviderok/base-ui-solid/accordion';

describe('<Accordion.Header />', () => {
  const { render } = createRenderer();

  describeConformance(Accordion.Header, () => ({
    render: (node, props) =>
      render(() => (
        <Accordion.Root>
          <Accordion.Item>{node(props!)}</Accordion.Item>
        </Accordion.Root>
      )),
    refInstanceof: window.HTMLHeadingElement,
  }));
});
