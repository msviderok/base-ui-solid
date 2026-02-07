import { createRenderer, describeConformance } from '#test-utils';
import { Field } from '@msviderok/base-ui-solid/field';
import { Form } from '@msviderok/base-ui-solid/form';
import { fireEvent, screen } from '@solidjs/testing-library';
import { expect } from 'chai';

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
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: '' } });
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
      fireEvent.change(input, { target: { value: 'a' } });
      expect(screen.queryByText('Message')).to.equal(null);

      fireEvent.change(input, { target: { value: '' } });
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
      fireEvent.change(input, { target: { value: 'a' } });
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
});
