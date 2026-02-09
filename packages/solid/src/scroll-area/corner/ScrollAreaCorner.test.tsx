import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import { screen, waitFor } from '@solidjs/testing-library';

describe('<ScrollArea.Corner />', () => {
  const { render } = createRenderer();

  describeConformance(ScrollArea.Corner, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <ScrollArea.Root>{node(props!)}</ScrollArea.Root>);
    },
  }));

  describe.skipIf(isJSDOM)('interactions', () => {
    it('should apply correct corner size when both scrollbars are present', async () => {
      render(() => (
        <ScrollArea.Root style={{ width: '200px', height: '200px' }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: '1000px', height: '1000px' }} />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" style={{ width: '10px' }} />
          <ScrollArea.Scrollbar orientation="horizontal" style={{ height: '10px' }} />
          <ScrollArea.Corner data-testid="corner" />
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const corner = screen.getByTestId('corner');
        const style = getComputedStyle(corner);
        expect(style.getPropertyValue('--scroll-area-corner-width')).to.equal('10px');
        // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
        expect(style.getPropertyValue('--scroll-area-corner-height')).to.equal('10px');
      });
    });
  });
});
