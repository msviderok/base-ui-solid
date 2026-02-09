import { createRenderer, describeConformance } from '#test-utils';
import { Progress } from '@msviderok/base-ui-solid/progress';

describe('<Progress.Track />', () => {
  const { render } = createRenderer();

  describeConformance(Progress.Track, () => ({
    render: (node, props) => render(() => <Progress.Root value={40}>{node(props!)}</Progress.Root>),
    refInstanceof: window.HTMLDivElement,
  }));
});
