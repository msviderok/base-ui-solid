import { createRenderer, describeConformance } from '#test-utils';
import { Collapsible } from '@msviderok/base-ui-solid/collapsible';

describe('<Collapsible.Trigger />', () => {
  const { render } = createRenderer();
  describeConformance(Collapsible.Trigger, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,
    render: (node, props) => render(() => <Collapsible.Root>{node(props!)}</Collapsible.Root>),
  }));
});
