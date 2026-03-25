import { createRenderer, describeConformance, isJSDOM, mockAnimationsFinished } from '#test-utils';
import { Checkbox } from '@msviderok/base-ui-solid/checkbox';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';
import { CheckboxRootContext } from '../root/CheckboxRootContext';

const testContext = {
  state: {
    checked: true,
    disabled: false,
    readOnly: false,
    required: false,
    indeterminate: false,
    dirty: false,
    touched: false,
    valid: null,
    filled: false,
    focused: false,
  },
};

describe('<Checkbox.Indicator />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  describeConformance(Checkbox.Indicator, () => ({
    refInstanceof: window.HTMLSpanElement,
    render: (node, props) =>
      render(() => (
        <CheckboxRootContext.Provider value={testContext}>
          {node(props!)}
        </CheckboxRootContext.Provider>
      )),
  }));

  it('should not render indicator by default', async () => {
    render(() => (
      <Checkbox.Root>
        <Checkbox.Indicator data-testid="indicator" />
      </Checkbox.Root>
    ));
    const indicator = screen.queryByTestId('indicator');
    expect(indicator).to.equal(null);
  });

  it('should render indicator when checked', async () => {
    render(() => (
      <Checkbox.Root checked>
        <Checkbox.Indicator data-testid="indicator" />
      </Checkbox.Root>
    ));
    const indicator = screen.getByTestId('indicator');
    expect(indicator).not.to.equal(null);
  });

  it('should spread extra props', async () => {
    render(() => (
      <Checkbox.Root defaultChecked>
        <Checkbox.Indicator data-testid="indicator" data-extra-prop="Lorem ipsum" />
      </Checkbox.Root>
    ));
    const indicator = screen.getByTestId('indicator');
    expect(indicator).to.have.attribute('data-extra-prop', 'Lorem ipsum');
  });

  describe('keepMounted prop', () => {
    it('should keep indicator mounted when unchecked', async () => {
      render(() => (
        <Checkbox.Root>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.to.equal(null);
    });

    it('should keep indicator mounted when checked', async () => {
      render(() => (
        <Checkbox.Root checked>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.to.equal(null);
    });

    it('should keep indicator mounted when indeterminate', async () => {
      render(() => (
        <Checkbox.Root indeterminate>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.to.equal(null);
    });
  });

  it('should remove the indicator when there is no exit animation defined', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    function Test() {
      const [checked, setChecked] = createSignal(true);
      return (
        <div>
          <button onClick={() => setChecked(false)}>Close</button>
          <Checkbox.Root checked={checked()}>
            <Checkbox.Indicator data-testid="indicator" />
          </Checkbox.Root>
        </div>
      );
    }

    const { user } = render(() => <Test />);

    expect(screen.getByTestId('indicator')).not.to.equal(null);

    const closeButton = screen.getByText('Close');

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('indicator')).to.equal(null);
    });
  });

  it('should remove the indicator when the animation finishes', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    let animationFinished = false;
    const notifyAnimationFinished = () => {
      animationFinished = true;
    };

    function Test() {
      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-indicator[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

      const [checked, setChecked] = createSignal(true);

      return (
        <div>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button onClick={() => setChecked(false)}>Close</button>
          <Checkbox.Root checked={checked()}>
            <Checkbox.Indicator
              class="animation-test-indicator"
              data-testid="indicator"
              onAnimationEnd={notifyAnimationFinished}
              keepMounted
            />
          </Checkbox.Root>
        </div>
      );
    }

    const { user } = render(() => <Test />);
    expect(screen.getByTestId('indicator')).not.to.equal(null);

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(animationFinished).to.equal(true);
    });
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      const style = `
        .animation-test-indicator {
          transition: opacity 1ms;
        }

        .animation-test-indicator[data-starting-style],
        .animation-test-indicator[data-ending-style] {
          opacity: 0;
        }
      `;

      function Test() {
        const [checked, setChecked] = createSignal(false);

        function handleCheck() {
          setChecked(true);
        }

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={handleCheck}>Check</button>
            <Checkbox.Root checked={checked()}>
              <Checkbox.Indicator
                class="animation-test-indicator"
                data-testid="indicator"
                onTransitionEnd={notifyTransitionFinished}
              />
            </Checkbox.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      expect(screen.queryByTestId('indicator')).to.equal(null);

      await user.click(screen.getByText('Check'));

      await waitFor(() => {
        expect(transitionFinished).to.equal(true);
      });

      expect(screen.getByTestId('indicator')).not.to.equal(null);
    });

    it('applies data-ending-style before unmount', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      function Test() {
        const [checked, setChecked] = createSignal(true);

        function handleUncheck() {
          setChecked(false);
        }

        return (
          <div>
            <button onClick={handleUncheck}>Uncheck</button>
            <Checkbox.Root checked={checked()}>
              <Checkbox.Indicator class="animation-test-indicator" data-testid="indicator" />
            </Checkbox.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.to.equal(null);

      // Headless Chromium can miss this component's real 1ms exit animation when the full
      // indicator suite runs, so keep the animation lifecycle under test control here.
      const animation = mockAnimationsFinished(indicator);

      await user.click(screen.getByText('Uncheck'));

      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).to.equal(indicator);
        expect(indicator).to.have.attribute('data-ending-style');
      });

      animation.finish();

      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).to.equal(null);
      });
    });
  });
});
