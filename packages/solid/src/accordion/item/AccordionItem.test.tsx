import { createRenderer, describeConformance } from '#test-utils';
import { Accordion } from '@msviderok/base-ui-solid/accordion';

describe('<Accordion.Item />', () => {
  const { render } = createRenderer();

  describeConformance(Accordion.Item, () => ({
    render: (node, props) => render(() => <Accordion.Root>{node(props!)}</Accordion.Root>),
    refInstanceof: window.HTMLDivElement,
  }));
});
