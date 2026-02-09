import { createRenderer, describeConformance } from '#test-utils';
import { Progress } from '@msviderok/base-ui-solid/progress';

describe('<Progress.Label />', () => {
  const { render } = createRenderer();

  describeConformance(Progress.Label, () => ({
    render: (node, props) => render(() => <Progress.Root value={40}>{node(props!)}</Progress.Root>),
    refInstanceof: window.HTMLSpanElement,
  }));
});
