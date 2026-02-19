import { createRenderer, describeConformance, flushMicrotasks, isJSDOM } from '#test-utils';
import { ScrollArea } from '@msviderok/base-ui-solid/scroll-area';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { DirectionProvider } from '../../direction-provider/DirectionProvider';
import { SCROLL_TIMEOUT } from '../constants';

const VIEWPORT_SIZE = 200;
const SCROLLABLE_CONTENT_SIZE = 1000;
const SCROLLBAR_WIDTH = 10;
const SCROLLBAR_HEIGHT = 10;

describe('<ScrollArea.Root />', () => {
  const { render } = createRenderer();

  describeConformance(ScrollArea.Root, () => ({
    refInstanceof: window.HTMLDivElement,
    render,
  }));

  describe('data-scrolling attribute', () => {
    const { render: renderWithClock, clock } = createRenderer();

    clock.withFakeTimers();

    it('adds [data-scrolling] attribute when viewport is scrolled', async () => {
      renderWithClock(() => (
        <ScrollArea.Root data-testid="root" style={{ width: '200px', height: '200px' }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: '1000px', height: '1000px' }} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      ));

      const root = screen.getByTestId('root');
      const viewport = screen.getByTestId('viewport');

      expect(root).not.to.have.attribute('data-scrolling');

      fireEvent.pointerEnter(viewport);
      fireEvent.scroll(viewport, { target: { scrollTop: 1 } });

      expect(root).to.have.attribute('data-scrolling', '');

      await clock.tickAsync(SCROLL_TIMEOUT);

      expect(root).not.to.have.attribute('data-scrolling');

      // Test horizontal scrolling
      fireEvent.pointerEnter(viewport);
      fireEvent.scroll(viewport, { target: { scrollLeft: 1 } });

      expect(root).to.have.attribute('data-scrolling', '');

      await clock.tickAsync(SCROLL_TIMEOUT);

      expect(root).not.to.have.attribute('data-scrolling');
    });
  });

  describe.skipIf(isJSDOM)('sizing', () => {
    it('should correctly set thumb height and width based on scrollable content', async () => {
      render(() => (
        <ScrollArea.Root style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                width: `${SCROLLABLE_CONTENT_SIZE}px`,
                height: `${SCROLLABLE_CONTENT_SIZE}px`,
              }}
            />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" data-testid="vertical-scrollbar">
            <ScrollArea.Thumb data-testid="vertical-thumb" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar orientation="horizontal" data-testid="horizontal-scrollbar">
            <ScrollArea.Thumb data-testid="horizontal-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const verticalThumb = screen.getByTestId('vertical-thumb');
        const horizontalThumb = screen.getByTestId('horizontal-thumb');

        expect(
          getComputedStyle(verticalThumb).getPropertyValue('--scroll-area-thumb-height'),
        ).to.equal(`${(VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE) * VIEWPORT_SIZE}px`);
        // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
        expect(
          getComputedStyle(horizontalThumb).getPropertyValue('--scroll-area-thumb-width'),
        ).to.equal(`${(VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE) * VIEWPORT_SIZE}px`);
      });
    });

    it('should not add padding for overlay scrollbars', async () => {
      render(() => (
        <ScrollArea.Root style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                width: `${SCROLLABLE_CONTENT_SIZE}px`,
                height: `${SCROLLABLE_CONTENT_SIZE}px`,
              }}
            />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            style={{ width: `${SCROLLBAR_WIDTH}px`, height: '100%' }}
          />
          <ScrollArea.Scrollbar
            orientation="horizontal"
            style={{ height: `${SCROLLBAR_HEIGHT}px`, width: '100%' }}
          />
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const contentWrapper = screen.getByTestId('viewport').firstElementChild!;
        const style = getComputedStyle(contentWrapper);

        expect(style.paddingLeft).to.equal('0px');
        expect(style.paddingRight).to.equal('0px');
        expect(style.paddingBottom).to.equal('0px');
      });
    });

    it('accounts for scrollbar padding', async () => {
      const PADDING = 8;

      render(() => (
        <ScrollArea.Root style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                width: `${SCROLLABLE_CONTENT_SIZE}px`,
                height: `${SCROLLABLE_CONTENT_SIZE}px`,
              }}
            />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            data-testid="vertical-scrollbar"
            style={{ 'padding-block': `${PADDING}px` }}
          >
            <ScrollArea.Thumb data-testid="vertical-thumb" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar
            orientation="horizontal"
            data-testid="horizontal-scrollbar"
            style={{ 'padding-inline': `${PADDING}px` }}
          >
            <ScrollArea.Thumb data-testid="horizontal-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const verticalThumb = screen.getByTestId('vertical-thumb');
        const horizontalThumb = screen.getByTestId('horizontal-thumb');

        expect(
          getComputedStyle(verticalThumb).getPropertyValue('--scroll-area-thumb-height'),
        ).to.equal(
          `${(VIEWPORT_SIZE - PADDING * 2) * (VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE)}px`,
        );
        // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
        expect(
          getComputedStyle(horizontalThumb).getPropertyValue('--scroll-area-thumb-width'),
        ).to.equal(
          `${(VIEWPORT_SIZE - PADDING * 2) * (VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE)}px`,
        );
      });
    });

    it('accounts for scrollbar margin', async () => {
      const margin = 11;
      const viewportSize = 390;

      render(() => (
        <ScrollArea.Root style={{ width: `${viewportSize}px`, height: `${viewportSize}px` }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                width: `${SCROLLABLE_CONTENT_SIZE}px`,
                height: `${SCROLLABLE_CONTENT_SIZE}px`,
              }}
            />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            data-testid="vertical-scrollbar"
            style={{ 'margin-inline': `${margin}px` }}
          >
            <ScrollArea.Thumb data-testid="vertical-thumb" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar
            orientation="horizontal"
            data-testid="horizontal-scrollbar"
            style={{ 'margin-block': `${margin}px` }}
          >
            <ScrollArea.Thumb data-testid="horizontal-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const verticalThumb = screen.getByTestId('vertical-thumb');
        const horizontalThumb = screen.getByTestId('horizontal-thumb');

        expect(
          getComputedStyle(verticalThumb).getPropertyValue('--scroll-area-thumb-height'),
        ).to.equal(`${viewportSize * (viewportSize / SCROLLABLE_CONTENT_SIZE)}px`);
        // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
        expect(
          getComputedStyle(horizontalThumb).getPropertyValue('--scroll-area-thumb-width'),
        ).to.equal(`${viewportSize * (viewportSize / SCROLLABLE_CONTENT_SIZE)}px`);
      });
    });

    it('accounts for thumb margin', async () => {
      const MARGIN = 8;

      render(() => (
        <ScrollArea.Root style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div
              style={{
                width: `${SCROLLABLE_CONTENT_SIZE}px`,
                height: `${SCROLLABLE_CONTENT_SIZE}px`,
              }}
            />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" data-testid="vertical-scrollbar">
            <ScrollArea.Thumb
              data-testid="vertical-thumb"
              style={{ 'margin-block': `${MARGIN}px` }}
            />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar orientation="horizontal" data-testid="horizontal-scrollbar">
            <ScrollArea.Thumb
              data-testid="horizontal-thumb"
              style={{ 'margin-inline': `${MARGIN}px` }}
            />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      await waitFor(() => {
        const verticalThumb = screen.getByTestId('vertical-thumb');
        const horizontalThumb = screen.getByTestId('horizontal-thumb');

        expect(
          getComputedStyle(verticalThumb).getPropertyValue('--scroll-area-thumb-height'),
        ).to.equal(`${(VIEWPORT_SIZE - MARGIN * 2) * (VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE)}px`);
        expect(
          getComputedStyle(horizontalThumb).getPropertyValue('--scroll-area-thumb-width'),
        ).to.equal(`${(VIEWPORT_SIZE - MARGIN * 2) * (VIEWPORT_SIZE / SCROLLABLE_CONTENT_SIZE)}px`);
      });
    });
  });

  describe.skipIf(isJSDOM)('overflow data attributes', () => {
    it('applies data attributes on root, viewport and scrollbars based on overflow and edges', async () => {
      render(() => (
        <ScrollArea.Root
          data-testid="root"
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
        >
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <ScrollArea.Content data-testid="content">
              <div
                style={{
                  width: `${SCROLLABLE_CONTENT_SIZE}px`,
                  height: `${SCROLLABLE_CONTENT_SIZE}px`,
                }}
              />
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" data-testid="scrollbar-vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar orientation="horizontal" data-testid="scrollbar-horizontal">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      const root = screen.getByTestId('root');
      const viewport = screen.getByTestId('viewport');
      const content = screen.getByTestId('content');
      const vScrollbar = screen.getByTestId('scrollbar-vertical');
      const hScrollbar = screen.getByTestId('scrollbar-horizontal');

      // Initial: at start (top/left)
      expect(root).to.have.attribute('data-has-overflow-x');
      expect(root).to.have.attribute('data-has-overflow-y');
      expect(root).not.to.have.attribute('data-overflow-x-start');
      expect(root).to.have.attribute('data-overflow-x-end');
      expect(root).not.to.have.attribute('data-overflow-y-start');
      expect(root).to.have.attribute('data-overflow-y-end');

      expect(viewport).to.have.attribute('data-has-overflow-x');
      expect(viewport).to.have.attribute('data-has-overflow-y');
      expect(viewport).not.to.have.attribute('data-overflow-x-start');
      expect(viewport).to.have.attribute('data-overflow-x-end');
      expect(viewport).not.to.have.attribute('data-overflow-y-start');
      expect(viewport).to.have.attribute('data-overflow-y-end');
      expect(content).to.have.attribute('data-has-overflow-x');
      expect(content).to.have.attribute('data-has-overflow-y');
      expect(content).not.to.have.attribute('data-overflow-x-start');
      expect(content).to.have.attribute('data-overflow-x-end');
      expect(content).not.to.have.attribute('data-overflow-y-start');
      expect(content).to.have.attribute('data-overflow-y-end');

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

      expect(root).to.have.attribute('data-overflow-y-start');
      expect(root).to.have.attribute('data-overflow-y-end');
      expect(root).to.have.attribute('data-overflow-x-start');
      expect(root).to.have.attribute('data-overflow-x-end');

      expect(viewport).to.have.attribute('data-overflow-y-start');
      expect(viewport).to.have.attribute('data-overflow-y-end');
      expect(viewport).to.have.attribute('data-overflow-x-start');
      expect(viewport).to.have.attribute('data-overflow-x-end');
      expect(content).to.have.attribute('data-overflow-y-start');
      expect(content).to.have.attribute('data-overflow-y-end');
      expect(content).to.have.attribute('data-overflow-x-start');
      expect(content).to.have.attribute('data-overflow-x-end');

      expect(vScrollbar).to.have.attribute('data-overflow-y-start');
      expect(vScrollbar).to.have.attribute('data-overflow-y-end');
      expect(hScrollbar).to.have.attribute('data-overflow-x-start');
      expect(hScrollbar).to.have.attribute('data-overflow-x-end');

      // Scroll to end
      fireEvent.scroll(viewport, {
        target: {
          scrollTop: viewport.scrollHeight - viewport.clientHeight,
          scrollLeft: viewport.scrollWidth - viewport.clientWidth,
        },
      });
      await flushMicrotasks();

      expect(root).to.have.attribute('data-overflow-y-start');
      expect(root).not.to.have.attribute('data-overflow-y-end');
      expect(root).to.have.attribute('data-overflow-x-start');
      expect(root).not.to.have.attribute('data-overflow-x-end');

      expect(viewport).to.have.attribute('data-overflow-y-start');
      expect(viewport).not.to.have.attribute('data-overflow-y-end');
      expect(viewport).to.have.attribute('data-overflow-x-start');
      expect(viewport).not.to.have.attribute('data-overflow-x-end');
      expect(content).to.have.attribute('data-overflow-y-start');
      expect(content).not.to.have.attribute('data-overflow-y-end');
      expect(content).to.have.attribute('data-overflow-x-start');
      expect(content).not.to.have.attribute('data-overflow-x-end');

      expect(vScrollbar).to.have.attribute('data-overflow-y-start');
      expect(vScrollbar).not.to.have.attribute('data-overflow-y-end');
      expect(hScrollbar).to.have.attribute('data-overflow-x-start');
      expect(hScrollbar).not.to.have.attribute('data-overflow-x-end');
    });

    it('treats near-edge scroll offsets as fully scrolled', async () => {
      render(() => (
        <ScrollArea.Root
          data-testid="root"
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
        >
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <ScrollArea.Content data-testid="content">
              <div
                style={{
                  width: `${SCROLLABLE_CONTENT_SIZE}px`,
                  height: `${SCROLLABLE_CONTENT_SIZE}px`,
                }}
              />
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" data-testid="scrollbar-vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar orientation="horizontal" data-testid="scrollbar-horizontal">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      const root = screen.getByTestId('root');
      const viewport = screen.getByTestId('viewport');

      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;

      fireEvent.scroll(viewport, {
        target: {
          scrollTop: maxScrollTop - 0.5,
          scrollLeft: maxScrollLeft - 0.5,
        },
      });
      await flushMicrotasks();

      expect(root).to.have.attribute('data-overflow-y-start');
      expect(root).not.to.have.attribute('data-overflow-y-end');
      expect(root).to.have.attribute('data-overflow-x-start');
      expect(root).not.to.have.attribute('data-overflow-x-end');
    });

    it('respects overflowEdgeThreshold and exposes scroll metrics', async () => {
      render(() => (
        <ScrollArea.Root
          data-testid="root"
          overflowEdgeThreshold={{ xStart: 20, yStart: 5 }}
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
        >
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <ScrollArea.Content data-testid="content">
              <div
                style={{
                  width: `${SCROLLABLE_CONTENT_SIZE}px`,
                  height: `${SCROLLABLE_CONTENT_SIZE}px`,
                }}
              />
            </ScrollArea.Content>
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

      fireEvent.scroll(viewport, {
        target: { scrollLeft: 15, scrollTop: 7 },
      });

      await waitFor(() => expect(viewport).not.to.have.attribute('data-overflow-x-start'));
      expect(viewport).to.have.attribute('data-overflow-y-start');

      fireEvent.scroll(viewport, {
        target: { scrollLeft: 35, scrollTop: 7 },
      });

      await waitFor(() => expect(viewport).to.have.attribute('data-overflow-x-start'));

      const viewportStyle = viewport.style;
      const startPx = viewportStyle.getPropertyValue('--scroll-area-overflow-x-start');
      expect(startPx).to.equal('35px');

      const horizontalEndPx = viewportStyle.getPropertyValue('--scroll-area-overflow-x-end');
      expect(horizontalEndPx).to.not.equal('');
      expect(horizontalEndPx).to.not.equal('0px');
    });

    it('does not add state attributes when content does not overflow', async () => {
      render(() => (
        <ScrollArea.Root
          data-testid="root"
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
        >
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <ScrollArea.Content data-testid="content">
              <div style={{ width: `${VIEWPORT_SIZE / 2}px`, height: `${VIEWPORT_SIZE / 2}px` }} />
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" keepMounted data-testid="scrollbar-vertical">
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar
            orientation="horizontal"
            keepMounted
            data-testid="scrollbar-horizontal"
          >
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ));

      const root = screen.getByTestId('root');
      const viewport = screen.getByTestId('viewport');
      const content = screen.getByTestId('content');
      const vScrollbar = screen.getByTestId('scrollbar-vertical');
      const hScrollbar = screen.getByTestId('scrollbar-horizontal');

      expect(root).not.to.have.attribute('data-has-overflow-x');
      expect(root).not.to.have.attribute('data-has-overflow-y');
      expect(root).not.to.have.attribute('data-overflow-x-start');
      expect(root).not.to.have.attribute('data-overflow-x-end');
      expect(root).not.to.have.attribute('data-overflow-y-start');
      expect(root).not.to.have.attribute('data-overflow-y-end');

      expect(viewport).not.to.have.attribute('data-overflow-x-start');
      expect(viewport).not.to.have.attribute('data-overflow-x-end');
      expect(viewport).not.to.have.attribute('data-overflow-y-start');
      expect(viewport).not.to.have.attribute('data-overflow-y-end');
      expect(content).not.to.have.attribute('data-overflow-x-start');
      expect(content).not.to.have.attribute('data-overflow-x-end');
      expect(content).not.to.have.attribute('data-overflow-y-start');
      expect(content).not.to.have.attribute('data-overflow-y-end');

      expect(vScrollbar).not.to.have.attribute('data-overflow-y-start');
      expect(vScrollbar).not.to.have.attribute('data-overflow-y-end');
      expect(hScrollbar).not.to.have.attribute('data-overflow-x-start');
      expect(hScrollbar).not.to.have.attribute('data-overflow-x-end');
    });

    it('correctly handles RTL', async () => {
      render(() => (
        <DirectionProvider direction="rtl">
          <ScrollArea.Root
            data-testid="root"
            style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px`, direction: 'rtl' }}
          >
            <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
              <div style={{ width: `${SCROLLABLE_CONTENT_SIZE}px`, height: '200px' }} />
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="horizontal" data-testid="scrollbar-horizontal">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </DirectionProvider>
      ));

      const root = screen.getByTestId('root');
      const viewport = screen.getByTestId('viewport');

      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      fireEvent.scroll(viewport, {
        target: {
          scrollLeft: 0,
        },
      });

      await waitFor(() => expect(root).to.have.attribute('data-has-overflow-x'));
      expect(root).not.to.have.attribute('data-overflow-x-start');
      expect(root).to.have.attribute('data-overflow-x-end');

      fireEvent.scroll(viewport, {
        target: {
          scrollLeft: -maxScrollLeft / 2,
        },
      });

      await waitFor(() => expect(root).to.have.attribute('data-overflow-x-start'));
      expect(root).to.have.attribute('data-overflow-x-end');

      fireEvent.scroll(viewport, {
        target: {
          scrollLeft: -maxScrollLeft,
        },
      });

      await waitFor(() => expect(root).to.have.attribute('data-overflow-x-start'));
      expect(root).not.to.have.attribute('data-overflow-x-end');
    });
  });
});
