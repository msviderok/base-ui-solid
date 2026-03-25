import { createRenderer, describeConformance, isJSDOM, mockAnimationsFinished } from '#test-utils';
import { Avatar } from '@msviderok/base-ui-solid/avatar';
import { screen, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Mock } from 'vitest';
import { useImageLoadingStatus } from './useImageLoadingStatus';

vi.mock('./useImageLoadingStatus');

describe('<Avatar.Image />', () => {
  const { render } = createRenderer();

  const useImageLoadingStatusMock = useImageLoadingStatus as Mock;

  beforeEach(() => {
    useImageLoadingStatusMock.mockReturnValue(() => 'loaded');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describeConformance(Avatar.Image, () => ({
    render: (node, props) => render(() => <Avatar.Root>{node(props!)}</Avatar.Root>),
    refInstanceof: window.HTMLImageElement,
  }));

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      useImageLoadingStatusMock.mockImplementation((options) => () =>
        options.src ? 'loaded' : 'idle',
      );

      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      const style = `
        .animation-test-image {
          transition: opacity 1ms;
        }

        .animation-test-image[data-starting-style],
        .animation-test-image[data-ending-style] {
          opacity: 0;
        }
      `;

      function Test() {
        const [showImage, setShowImage] = createSignal(false);

        function handleShowImage() {
          setShowImage(true);
        }

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={handleShowImage}>Show image</button>
            <Avatar.Root>
              <Avatar.Image
                class="animation-test-image"
                data-testid="image"
                onTransitionEnd={notifyTransitionFinished}
                src={showImage() ? 'avatar.png' : undefined}
              />
            </Avatar.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      expect(screen.queryByTestId('image')).to.equal(null);

      await user.click(screen.getByText('Show image'));

      await waitFor(() => {
        expect(transitionFinished).to.equal(true);
      });

      expect(screen.getByTestId('image')).not.to.equal(null);
    });

    it('applies data-ending-style before unmount', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      useImageLoadingStatusMock.mockImplementation((options) => () =>
        options.src ? 'loaded' : 'idle',
      );

      function Test() {
        const [showImage, setShowImage] = createSignal(true);

        function handleHideImage() {
          setShowImage(false);
        }

        return (
          <div>
            <button onClick={handleHideImage}>Hide image</button>
            <Avatar.Root>
              <Avatar.Image
                class="animation-test-image"
                data-testid="image"
                src={showImage() ? 'avatar.png' : undefined}
              />
            </Avatar.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      const image = screen.getByTestId('image');
      expect(image).not.to.equal(null);
      const animation = mockAnimationsFinished(image);

      await user.click(screen.getByText('Hide image'));

      await waitFor(() => {
        expect(screen.queryByTestId('image')).to.equal(image);
        expect(image).to.have.attribute('data-ending-style');
      });

      animation.finish();

      await waitFor(() => {
        expect(screen.queryByTestId('image')).to.equal(null);
      });
    });
  });
});
