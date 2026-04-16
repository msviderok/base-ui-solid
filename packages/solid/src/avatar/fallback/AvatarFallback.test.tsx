import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Avatar } from '@msviderok/base-ui-solid/avatar';
import { screen, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Mock } from 'vitest';
import { useImageLoadingStatus } from '../image/useImageLoadingStatus';

vi.mock('../image/useImageLoadingStatus');

describe('<Avatar.Fallback />', () => {
  const { render } = createRenderer();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describeConformance(Avatar.Fallback, () => ({
    render: (node, props) => render(() => <Avatar.Root>{node(props!)}</Avatar.Root>),
    refInstanceof: window.HTMLSpanElement,
  }));

  it.skipIf(!isJSDOM)('should not render the children if the image loaded', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(() => 'loaded');

    render(() => (
      <Avatar.Root>
        <Avatar.Image />
        <Avatar.Fallback data-testid="fallback" />
      </Avatar.Root>
    ));

    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).to.equal(null);
    });
  });

  it.skipIf(!isJSDOM)('should render the fallback if the image fails to load', async () => {
    (useImageLoadingStatus as Mock).mockReturnValue(() => 'error');

    render(() => (
      <Avatar.Root>
        <Avatar.Image />
        <Avatar.Fallback>AC</Avatar.Fallback>
      </Avatar.Root>
    ));

    await waitFor(() => {
      expect(screen.queryByText('AC')).not.to.equal(null);
    });
  });

  describe.skipIf(!isJSDOM)('prop: delay', () => {
    const { clock, render: renderFakeTimers } = createRenderer();

    clock.withFakeTimers();

    it('shows the fallback when the delay has elapsed', async () => {
      (useImageLoadingStatus as Mock).mockReturnValue(() => undefined);

      renderFakeTimers(() => (
        <Avatar.Root>
          <Avatar.Image />
          <Avatar.Fallback delay={100}>AC</Avatar.Fallback>
        </Avatar.Root>
      ));

      expect(screen.queryByText('AC')).to.equal(null);

      clock.tick(100);

      expect(screen.queryByText('AC')).to.not.equal(null);
    });
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const useImageLoadingStatusMock = useImageLoadingStatus as Mock;
      useImageLoadingStatusMock.mockImplementation(
        (options) => () => (options.src ? 'loaded' : 'error'),
      );

      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      const style = `
        .animation-test-fallback {
          transition: opacity 1ms;
        }

        .animation-test-fallback[data-starting-style],
        .animation-test-fallback[data-ending-style] {
          opacity: 0;
        }
      `;

      function Test() {
        const [showImage, setShowImage] = createSignal(true);

        function handleShowFallback() {
          setShowImage(false);
        }

        return (
          <div>
            <style>{style}</style>
            <button onClick={handleShowFallback}>Show fallback</button>
            <Avatar.Root>
              <Avatar.Image src={showImage() ? 'avatar.png' : undefined} />
              <Avatar.Fallback
                class="animation-test-fallback"
                data-testid="fallback"
                onTransitionEnd={notifyTransitionFinished}
              >
                AC
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      await waitFor(() => {
        expect(screen.queryByTestId('fallback')).to.equal(null);
      });

      await user.click(screen.getByText('Show fallback'));

      await waitFor(() => {
        expect(transitionFinished).to.equal(true);
      });

      expect(screen.getByTestId('fallback')).not.to.equal(null);
    });

    it('applies data-ending-style before unmount', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const useImageLoadingStatusMock = useImageLoadingStatus as Mock;
      useImageLoadingStatusMock.mockImplementation(
        (options) => () => (options.src ? 'loaded' : 'error'),
      );

      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-fallback[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

      function Test() {
        const [showImage, setShowImage] = createSignal(false);

        function handleShowImage() {
          setShowImage(true);
        }

        return (
          <div>
            <style>{style}</style>
            <button onClick={handleShowImage}>Show image</button>
            <Avatar.Root>
              <Avatar.Image src={showImage() ? 'avatar.png' : undefined} />
              <Avatar.Fallback class="animation-test-fallback" data-testid="fallback">
                AC
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      expect(screen.getByTestId('fallback')).not.to.equal(null);

      await user.click(screen.getByText('Show image'));

      await waitFor(() => {
        const fallback = screen.queryByTestId('fallback');
        expect(fallback).not.to.equal(null);
        expect(fallback).to.have.attribute('data-ending-style');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('fallback')).to.equal(null);
      });
    });
  });
});
