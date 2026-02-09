import { createRenderer, describeConformance, flushMicrotasks, isJSDOM } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import { fireEvent, screen } from '@solidjs/testing-library';
import { SCROLL_TIMEOUT } from '../constants';

describe('<ScrollArea.Scrollbar />', () => {
  const { render, clock } = createRenderer();

  clock.withFakeTimers();

  describeConformance(
    (props) => <ScrollArea.Scrollbar keepMounted {...props} ref={props.ref} />,
    () => ({
      refInstanceof: window.HTMLDivElement,
      render(node, props) {
        return render(() => <ScrollArea.Root>{node(props!)}</ScrollArea.Root>);
      },
    }),
  );

  it('adds [data-scrolling] attribute when viewport is scrolled in the correct direction', async () => {
    render(() => (
      <ScrollArea.Root style={{ width: '200px', height: '200px' }}>
        <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
          <div style={{ width: '1000px', height: '1000px' }} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" data-testid="vertical" keepMounted />
        <ScrollArea.Scrollbar orientation="horizontal" data-testid="horizontal" keepMounted />
        <ScrollArea.Corner />
      </ScrollArea.Root>
    ));

    const verticalScrollbar = screen.getByTestId('vertical');
    const horizontalScrollbar = screen.getByTestId('horizontal');
    const viewport = screen.getByTestId('viewport');

    expect(verticalScrollbar).not.toHaveAttribute('data-scrolling');
    expect(horizontalScrollbar).not.toHaveAttribute('data-scrolling');

    fireEvent.pointerEnter(viewport);
    fireEvent.scroll(viewport, {
      target: {
        scrollTop: 1,
      },
    });

    expect(verticalScrollbar).toHaveAttribute('data-scrolling', '');
    expect(horizontalScrollbar).not.toHaveAttribute('data-scrolling', '');

    await clock.tickAsync(SCROLL_TIMEOUT - 1);

    expect(verticalScrollbar).toHaveAttribute('data-scrolling', '');
    expect(horizontalScrollbar).not.toHaveAttribute('data-scrolling', '');

    fireEvent.pointerEnter(viewport);
    fireEvent.scroll(viewport, {
      target: {
        scrollLeft: 1,
      },
    });

    await clock.tickAsync(1); // vertical just finished

    expect(verticalScrollbar).not.toHaveAttribute('data-scrolling');
    expect(horizontalScrollbar).toHaveAttribute('data-scrolling');

    await clock.tickAsync(SCROLL_TIMEOUT - 2); // already ticked 1ms above

    expect(verticalScrollbar).not.toHaveAttribute('data-scrolling');
    expect(horizontalScrollbar).toHaveAttribute('data-scrolling');

    await clock.tickAsync(1);

    expect(verticalScrollbar).not.toHaveAttribute('data-scrolling');
    expect(horizontalScrollbar).not.toHaveAttribute('data-scrolling');
  });

  describe.skipIf(isJSDOM)('data overflow attributes (scrollbars)', () => {
    const VIEWPORT_SIZE = '200px';
    const SCROLLABLE_CONTENT_SIZE = '1000px';

    it('applies data attributes on vertical and horizontal scrollbars', async () => {
      render(() => (
        <ScrollArea.Root style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: SCROLLABLE_CONTENT_SIZE, height: SCROLLABLE_CONTENT_SIZE }} />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" data-testid="scrollbar-vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar orientation="horizontal" data-testid="scrollbar-horizontal">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      const viewport = screen.getByTestId('viewport');
      const vScrollbar = screen.getByTestId('scrollbar-vertical');
      const hScrollbar = screen.getByTestId('scrollbar-horizontal');

      expect(vScrollbar).to.have.attribute('data-has-overflow-y');
      expect(vScrollbar).not.to.have.attribute('data-overflow-y-start');
      expect(vScrollbar).to.have.attribute('data-overflow-y-end');

      expect(hScrollbar).to.have.attribute('data-has-overflow-x');
      expect(hScrollbar).not.to.have.attribute('data-overflow-x-start');
      expect(hScrollbar).to.have.attribute('data-overflow-x-end');

      // Scroll to middle
      const halfY = (viewport.scrollHeight - viewport.clientHeight) / 2;
      const halfX = (viewport.scrollWidth - viewport.clientWidth) / 2;
      fireEvent.scroll(viewport, {
        target: { scrollTop: halfY, scrollLeft: halfX },
      });
      await flushMicrotasks();

      expect(vScrollbar).to.have.attribute('data-overflow-y-start');
      expect(vScrollbar).to.have.attribute('data-overflow-y-end');
      expect(hScrollbar).to.have.attribute('data-overflow-x-start');
      expect(hScrollbar).to.have.attribute('data-overflow-x-end');
    });
  });
});
