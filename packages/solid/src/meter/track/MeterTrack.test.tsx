import { createRenderer, describeConformance } from '#test-utils';
import { Meter } from '@msviderok/base-ui-solid/meter';

describe('<Meter.Track />', () => {
  const { render } = createRenderer();

  describeConformance(Meter.Track, () => ({
    render: (node, props) => render(() => <Meter.Root value={30}>{node(props!)}</Meter.Root>),
    refInstanceof: window.HTMLDivElement,
  }));
});
