import { createRenderer, describeConformance } from '#test-utils';
import { PreviewCard } from '@msviderok/base-ui-solid/preview-card';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Popover.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(PreviewCard.Popup, () => ({
    render: (node, props) =>
      render(() => (
        <PreviewCard.Root open>
          <PreviewCard.Portal>
            <PreviewCard.Positioner>{node(props!)}</PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      )),
    refInstanceof: window.HTMLDivElement,
  }));

  it('should render the children', async () => {
    render(() => (
      <PreviewCard.Root open>
        <PreviewCard.Portal>
          <PreviewCard.Positioner>
            <PreviewCard.Popup>Content</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ));

    expect(screen.getByText('Content')).not.to.equal(null);
  });
});
