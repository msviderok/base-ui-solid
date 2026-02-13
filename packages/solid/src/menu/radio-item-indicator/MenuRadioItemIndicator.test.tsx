import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Menu.RadioItemIndicator />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Menu.RadioItemIndicator keepMounted {...props} ref={props.ref} />,
    () => ({
      refInstanceof: window.HTMLSpanElement,
      render: (node, props) =>
        render(() => (
          <Menu.Root open>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.RadioGroup>
                    <Menu.RadioItem value="">{node(props!)}</Menu.RadioItem>
                  </Menu.RadioGroup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )),
    }),
  );

  it('should remove the indicator when there is no exit animation defined', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    function Test() {
      const [value, setValue] = createSignal('a');
      return (
        <div>
          <button onClick={() => setValue('b')}>Close</button>
          <Menu.Root open modal={false}>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Popup>
                    <Menu.RadioGroup value={value()}>
                      <Menu.RadioItem value="a">
                        <Menu.RadioItemIndicator data-testid="indicator" />
                      </Menu.RadioItem>
                      <Menu.RadioItem value="b">
                        <Menu.RadioItemIndicator keepMounted />
                      </Menu.RadioItem>
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      );
    }

    const { user } = render(() => <Test />);

    expect(screen.queryByTestId('indicator')).not.to.equal(null);

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

      const [value, setValue] = createSignal('a');

      return (
        <div>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button onClick={() => setValue('b')}>Close</button>
          <Menu.Root open modal={false}>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.RadioGroup value={value()}>
                    <Menu.RadioItem value="a">
                      <Menu.RadioItemIndicator
                        class="animation-test-indicator"
                        data-testid="indicator"
                        keepMounted
                        onAnimationEnd={notifyAnimationFinished}
                      />
                    </Menu.RadioItem>
                    <Menu.RadioItem value="b">
                      <Menu.RadioItemIndicator keepMounted />
                    </Menu.RadioItem>
                  </Menu.RadioGroup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
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
});
