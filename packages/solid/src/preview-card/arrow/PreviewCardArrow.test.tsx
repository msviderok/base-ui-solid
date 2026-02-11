import { createRenderer, describeConformance } from '#test-utils';
import { PreviewCard } from '@msviderok/base-ui-solid/preview-card';

describe('<PreviewCard.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(PreviewCard.Arrow, () => ({
    render: (node, props) =>
      render(() => (
        <PreviewCard.Root open>
          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup>{node(props!)}</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      )),
    refInstanceof: window.HTMLDivElement,
  }));
});
