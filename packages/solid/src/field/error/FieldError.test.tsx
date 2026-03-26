import { createRenderer, describeConformance, isJSDOM, mockAnimationsFinished } from '#test-utils';
import { Field } from '@msviderok/base-ui-solid/field';
import { Form } from '@msviderok/base-ui-solid/form';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Field.Error />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Field.Error match {...props} ref={props.ref} />,
    () => ({
      refInstanceof: window.HTMLDivElement,
      render: (node, props) => render(() => <Field.Root invalid>{node(props!)}</Field.Root>),
    }),
  );

  it('should set aria-describedby on the control automatically', async () => {
    render(() => (
      <Field.Root invalid>
        <Field.Control />
        <Field.Error match>Message</Field.Error>
      </Field.Root>
    ));

    expect(screen.getByRole('textbox')).to.have.attribute(
      'aria-describedby',
      screen.getByText('Message').id,
    );
  });

  it('should show error messages by default', async () => {
    render(() => (
      <Form>
        <Field.Root>
          <Field.Control required />
          <Field.Error>Message</Field.Error>
        </Field.Root>
        <button type="submit">submit</button>
      </Form>
    ));

    expect(screen.queryByText('Message')).to.equal(null);

    const input = screen.getByRole<HTMLInputElement>('textbox');

    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: 'a' } });
    fireEvent.input(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(screen.queryByText('Message')).to.equal(null);

    fireEvent.click(screen.getByText('submit'));
    expect(screen.queryByText('Message')).not.to.equal(null);
  });

  describe('prop: match', () => {
    it('should only render when `match` matches constraint validation', async () => {
      render(() => (
        <Form>
          <Field.Root>
            <Field.Control required minLength={2} />
            <Field.Error match="valueMissing">Message</Field.Error>
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      expect(screen.queryByText('Message')).to.equal(null);

      fireEvent.click(screen.getByText('submit'));
      expect(screen.queryByText('Message')).not.to.equal(null);

      const input = screen.getByRole<HTMLInputElement>('textbox');

      fireEvent.focus(input);
      fireEvent.input(input, { target: { value: 'a' } });
      expect(screen.queryByText('Message')).to.equal(null);

      fireEvent.input(input, { target: { value: '' } });
      expect(screen.queryByText('Message')).not.to.equal(null);
    });

    it('should show custom errors', async () => {
      render(() => (
        <Form>
          <Field.Root validate={() => 'error'}>
            <Field.Control />
            <Field.Error match="customError">Message</Field.Error>
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      fireEvent.focus(input);
      fireEvent.input(input, { target: { value: 'a' } });
      fireEvent.blur(input);
      expect(screen.queryByText('Message')).to.equal(null);

      fireEvent.click(screen.getByText('submit'));
      expect(screen.queryByText('Message')).not.to.equal(null);
    });

    it('always renders the error message when `match` is true', async () => {
      render(() => (
        <Field.Root>
          <Field.Control required />
          <Field.Error match>Message</Field.Error>
        </Field.Root>
      ));

      expect(screen.queryByText('Message')).not.to.equal(null);
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
        .animation-test-error {
          transition: opacity 1ms;
        }

        .animation-test-error[data-starting-style],
        .animation-test-error[data-ending-style] {
          opacity: 0;
        }
      `;

      function Test() {
        const [showError, setShowError] = createSignal(false);

        function handleShowError() {
          setShowError(true);
        }

        return (
          <div>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={style} />
            <button onClick={handleShowError}>Show</button>
            <Field.Root>
              <Field.Control required />
              <Field.Error
                class="animation-test-error"
                data-testid="error"
                match={showError()}
                onTransitionEnd={notifyTransitionFinished}
              >
                Message
              </Field.Error>
            </Field.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      expect(screen.queryByTestId('error')).to.equal(null);

      await user.click(screen.getByText('Show'));

      await waitFor(() => {
        expect(transitionFinished).to.equal(true);
      });

      expect(screen.getByTestId('error')).not.to.equal(null);
    });

    it('applies data-ending-style before unmount', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-error[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

      function Test() {
        const [showError, setShowError] = createSignal(true);

        function handleHideError() {
          setShowError(false);
        }

        return (
          <div>
            <button onClick={handleHideError}>Hide</button>
            <Field.Root>
              <Field.Control required />
              <Field.Error class="animation-test-error" data-testid="error" match={showError()}>
                Message
              </Field.Error>
            </Field.Root>
          </div>
        );
      }

      const { user } = render(() => <Test />);
      const error = screen.getByTestId('error');
      expect(error).not.to.equal(null);
      const animation = mockAnimationsFinished(error);

      await user.click(screen.getByText('Hide'));

      await waitFor(() => {
        expect(screen.queryByTestId('error')).to.equal(error);
        expect(error).to.have.attribute('data-ending-style');
      });

      animation.finish();

      await waitFor(() => {
        expect(screen.queryByTestId('error')).to.equal(null);
      });
    });
  });
});
