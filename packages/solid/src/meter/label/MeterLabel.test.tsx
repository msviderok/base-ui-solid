import { createRenderer, describeConformance } from '#test-utils';
import { Meter } from '@msviderok/base-ui-solid/meter';

describe('<Meter.Label />', () => {
  const { render } = createRenderer();

  describeConformance(Meter.Label, () => ({
    render: (node, props) => render(() => <Meter.Root value={50}>{node(props!)}</Meter.Root>),
    refInstanceof: window.HTMLSpanElement,
  }));
});
