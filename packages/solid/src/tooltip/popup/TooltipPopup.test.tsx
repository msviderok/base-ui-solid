import { createRenderer, describeConformance } from '#test-utils';
import { Tooltip } from '@msviderok/base-ui-solid/tooltip';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Tooltip.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Popup, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => (
        <Tooltip.Root open>
          <Tooltip.Portal>
            <Tooltip.Positioner>{node(props!)}</Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
    },
  }));

  it('should render the children', async () => {
    render(() => (
      <Tooltip.Root open>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>Content</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    expect(screen.getByText('Content')).not.to.equal(null);
  });
});
