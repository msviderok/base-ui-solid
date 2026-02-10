import { createRenderer, describeConformance } from '#test-utils';
import { Tooltip } from '@msviderok/base-ui-solid/tooltip';

describe('<Tooltip.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Tooltip.Root open>{node(props!)}</Tooltip.Root>);
    },
  }));
});
