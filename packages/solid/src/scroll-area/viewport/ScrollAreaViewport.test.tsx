import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<ScrollArea.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(ScrollArea.Viewport, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <ScrollArea.Root>{node(props!)}</ScrollArea.Root>);
    },
  }));

  describe.skipIf(isJSDOM)('overflow data attributes (viewport)', () => {
    const VIEWPORT_SIZE = '200px';
    const SCROLLABLE_CONTENT_SIZE = '1000px';

    it('applies data attributes on viewport', async () => {
      render(() => (
        <ScrollArea.Root style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: SCROLLABLE_CONTENT_SIZE, height: SCROLLABLE_CONTENT_SIZE }} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      ));

      const viewport = screen.getByTestId('viewport');

      expect(viewport).to.have.attribute('data-has-overflow-x');
      expect(viewport).to.have.attribute('data-has-overflow-y');
      expect(viewport).not.to.have.attribute('data-overflow-x-start');
      expect(viewport).to.have.attribute('data-overflow-x-end');
      expect(viewport).not.to.have.attribute('data-overflow-y-start');
      expect(viewport).to.have.attribute('data-overflow-y-end');
    });
  });
});
