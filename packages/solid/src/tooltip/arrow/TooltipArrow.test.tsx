import { createRenderer, describeConformance } from '#test-utils';
import { Tooltip } from '@msviderok/base-ui-solid/tooltip';

describe('<Tooltip.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Arrow, () => ({
    refInstanceof: window.Element,
    render(node, props) {
      return render(() => (
        <Tooltip.Root open>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>{node(props!)}</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
    },
  }));
});
