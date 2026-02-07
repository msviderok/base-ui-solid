import { createRenderer, describeConformance, flushMicrotasks } from '#test-utils';
import { Checkbox } from '@msviderok/base-ui-solid/checkbox';
import { CheckboxGroup } from '@msviderok/base-ui-solid/checkbox-group';
import { Field } from '@msviderok/base-ui-solid/field';
import { Form } from '@msviderok/base-ui-solid/form';
import { NumberField } from '@msviderok/base-ui-solid/number-field';
import { Radio } from '@msviderok/base-ui-solid/radio';
import { RadioGroup } from '@msviderok/base-ui-solid/radio-group';
import { Select } from '@msviderok/base-ui-solid/select';
import { Slider } from '@msviderok/base-ui-solid/slider';
import { Switch } from '@msviderok/base-ui-solid/switch';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal } from 'solid-js';

describe('<Field.Root />', () => {
  const { render } = createRenderer();

  describeConformance(Field.Root, () => ({
    refInstanceof: window.HTMLDivElement,
    render,
  }));

  describe('prop: disabled', () => {
    it('should add data-disabled style hook to all components', async () => {
      render(() => (
        <Field.Root data-testid="field" disabled>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="message" />
        </Field.Root>
      ));

      const field = screen.getByTestId('field');
      const control = screen.getByTestId('control');
      const label = screen.getByTestId('label');
      const message = screen.getByTestId('message');

      expect(field).to.have.attribute('data-disabled', '');
      expect(control).to.have.attribute('data-disabled', '');
      expect(label).to.have.attribute('data-disabled', '');
      expect(message).to.have.attribute('data-disabled', '');
    });
  });

  describe('prop: validate', () => {
    it('when not in <Form> the function does not run by default', () => {
      const validateSpy = spy(() => 'error');
      render(() => (
        <Field.Root validate={validateSpy}>
          <Field.Control />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.focus(control);
      fireEvent.change(control, { target: { value: 'abc' } });
      expect(validateSpy.callCount).to.equal(0);
      expect(screen.queryByText('error')).to.equal(null);

      fireEvent.blur(control);
      expect(validateSpy.callCount).to.equal(0);
      expect(screen.queryByText('error')).to.equal(null);
    });

    it('runs after native validations', async () => {
      render(() => (
        <Form>
          <Field.Root validate={(val) => (val === 'ab' ? 'custom error' : null)}>
            <Field.Control required />
            <Field.Error match="valueMissing">value missing</Field.Error>
            <Field.Error match="customError" />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      expect(screen.queryByText('value missing')).to.equal(null);
      expect(screen.queryByText('custom error')).to.equal(null);

      const input = screen.getByRole<HTMLInputElement>('textbox');

      // submit
      fireEvent.click(screen.getByText('submit'));
      expect(screen.queryByText('value missing')).not.to.equal(null);
      expect(screen.queryByText('custom error')).to.equal(null);

      fireEvent.focus(input);
      // revalidate
      fireEvent.change(input, { target: { value: 'ab' } });
      expect(screen.queryByText('value missing')).to.equal(null);
      expect(screen.queryByText('custom error')).not.to.equal(null);

      fireEvent.change(input, { target: { value: '' } });
      expect(screen.queryByText('value missing')).not.to.equal(null);
      // expect(screen.queryByText('custom error')).to.equal(null);
    });

    it('should apply aria-invalid prop to control once validation finishes', () => {
      render(() => (
        <Form>
          <Field.Root validate={() => 'error'}>
            <Field.Control />
            <Field.Error />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const control = screen.getByRole('textbox');
      expect(control).not.to.have.attribute('aria-invalid');

      fireEvent.click(screen.getByText('submit'));
      expect(control).to.have.attribute('aria-invalid', 'true');
    });

    it('receives all form values as the 2nd argument', async () => {
      const validateSpy = spy();

      render(() => (
        <Form>
          <Field.Root name="checkbox">
            <Checkbox.Root defaultChecked />
          </Field.Root>

          <Field.Root name="checkbox-group">
            <CheckboxGroup defaultValue={['apple', 'banana']}>
              <Checkbox.Root value="apple" />
              <Checkbox.Root value="banana" />
            </CheckboxGroup>
          </Field.Root>

          <Field.Root name="input" validate={validateSpy}>
            <Field.Control data-testid="input" type="url" defaultValue="https://base-ui.com" />
          </Field.Root>

          <Field.Root name="number-field">
            <NumberField.Root defaultValue={13}>
              <NumberField.Input />
            </NumberField.Root>
          </Field.Root>

          <Field.Root name="radio-group">
            <RadioGroup defaultValue="cats">
              <Radio.Root value="cats" />
            </RadioGroup>
          </Field.Root>

          <Field.Root name="select">
            <Select.Root defaultValue="sans">
              <Select.Trigger />
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    <Select.Item value="sans" />
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </Field.Root>

          <Field.Root name="slider">
            <Slider.Root defaultValue={12}>
              <Slider.Control />
            </Slider.Root>
          </Field.Root>

          <Field.Root name="range-slider">
            <Slider.Root defaultValue={[25, 70]}>
              <Slider.Control />
            </Slider.Root>
          </Field.Root>

          <Field.Root name="switch">
            <Switch.Root defaultChecked={false} />
          </Field.Root>

          <button type="submit">submit</button>
        </Form>
      ));

      fireEvent.click(screen.getByText('submit'));

      expect(validateSpy.callCount).to.equal(1);
      expect(validateSpy.firstCall.args[1]).to.deep.equal({
        checkbox: true,
        'checkbox-group': ['apple', 'banana'],
        input: 'https://base-ui.com',
        'number-field': 13,
        'radio-group': 'cats',
        select: 'sans',
        slider: 12,
        'range-slider': [25, 70],
        switch: false,
      });
    });

    it('unmounted fields are excluded from the validate fn', async () => {
      const validateSpy = spy();
      function App() {
        const [checked, setChecked] = createSignal(true);

        return (
          <Form>
            <input type="checkbox" checked={checked()} onChange={() => setChecked(!checked())} />
            {checked() && (
              <Field.Root name="input1">
                <Field.Control defaultValue="one" />
              </Field.Root>
            )}
            <Field.Root name="input2" validate={validateSpy}>
              <Field.Control defaultValue="two" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        );
      }
      render(() => <App />);

      fireEvent.click(screen.getByText('submit'));

      expect(validateSpy.callCount).to.equal(1);
      expect(validateSpy.firstCall.args[1]).to.deep.equal({
        input1: 'one',
        input2: 'two',
      });

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByText('submit'));

      expect(validateSpy.callCount).to.equal(2);
      expect(validateSpy.lastCall.args[1]).to.deep.equal({
        input2: 'two',
      });
    });
  });

  describe('prop: validationMode', () => {
    describe('onSubmit', () => {
      it('should validate the field on submit', () => {
        render(() => (
          <Form>
            <Field.Root validate={() => 'error'}>
              <Field.Control />
              <Field.Error />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.click(screen.getByText('submit'));

        expect(screen.queryByText('error')).not.to.equal(null);
      });

      it('revalidates on change', () => {
        render(() => (
          <Form>
            <Field.Root>
              <Field.Control type="url" required defaultValue="" />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const control = screen.getByRole<HTMLInputElement>('textbox');

        expect(screen.queryByTestId('error')).to.equal(null);

        fireEvent.click(screen.getByText('submit'));
        expect(screen.queryByTestId('error')).not.to.equal(null);

        fireEvent.change(control, { target: { value: 'http://example' } });
        expect(screen.queryByTestId('error')).to.equal(null);
      });
    });

    describe('onChange', () => {
      it('validates the field on change', async () => {
        render(() => (
          <Field.Root
            validationMode="onChange"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? 'error' : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole<HTMLInputElement>('textbox');
        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.input(control, { target: { value: 't' } });

        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });
    });

    describe('onBlur', () => {
      it('validates the field on blur', async () => {
        render(() => (
          <Field.Root
            validationMode="onBlur"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? 'error' : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole<HTMLInputElement>('textbox');
        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.change(control, { target: { value: 't' } });

        expect(control).not.to.have.attribute('data-invalid');

        fireEvent.blur(control);

        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });

      it('should not mark invalid if `valueMissing` is the only error and not yet dirtied', () => {
        render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId('control');

        fireEvent.focus(control);
        fireEvent.blur(control);

        expect(control).not.to.have.attribute('data-invalid');
        expect(control).not.to.have.attribute('aria-invalid');
      });

      it('should mark invalid if `valueMissing` is the only error and dirtied', async () => {
        render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId('control');

        fireEvent.focus(control);
        fireEvent.change(control, { target: { value: 'a' } });
        fireEvent.change(control, { target: { value: '' } });
        fireEvent.blur(control);

        expect(control).to.have.attribute('data-invalid', '');
        expect(control).to.have.attribute('aria-invalid', 'true');
      });

      it('supports async validation', async () => {
        render(() => (
          <Field.Root validationMode="onBlur" validate={() => Promise.resolve('error')}>
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole('textbox');
        const message = screen.queryByText('error');

        expect(message).to.equal(null);

        fireEvent.focus(control);
        fireEvent.blur(control);

        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.queryByText('error')).not.to.equal(null);
        });
      });

      it('should apply [data-field] style hooks to field components', () => {
        render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Label data-testid="label">Label</Field.Label>
            <Field.Description data-testid="description">Description</Field.Description>
            <Field.Error data-testid="error" />
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId<HTMLInputElement>('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');
        let error = screen.queryByTestId('error');

        expect(control).not.to.have.attribute('data-valid');
        expect(label).not.to.have.attribute('data-valid');
        expect(description).not.to.have.attribute('data-valid');
        expect(error).to.equal(null);

        fireEvent.focus(control);
        fireEvent.change(control, { target: { value: 'a' } });
        fireEvent.change(control, { target: { value: '' } });
        fireEvent.blur(control);

        error = screen.getByTestId('error');

        expect(control).to.have.attribute('data-invalid', '');
        expect(label).to.have.attribute('data-invalid', '');
        expect(description).to.have.attribute('data-invalid', '');
        expect(error).to.have.attribute('data-invalid', '');

        control.value = 'value';
        control.focus();
        control.blur();

        error = screen.queryByTestId('error');

        expect(control).to.have.attribute('data-valid', '');
        expect(label).to.have.attribute('data-valid', '');
        expect(description).to.have.attribute('data-valid', '');
        expect(error).to.equal(null);
      });

      describe('revalidation', () => {
        it('revalidates on change for `valueMissing`', async () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control required />
              <Field.Error />
            </Field.Root>
          ));

          const control = screen.getByRole('textbox');
          const message = screen.queryByText('error');

          expect(message).to.equal(null);

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: 't' } });
          fireEvent.blur(control);

          expect(control).not.to.have.attribute('aria-invalid', 'true');

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: '' } });
          fireEvent.blur(control);

          expect(control).to.have.attribute('aria-invalid');
        });

        it('handles both `required` and `typeMismatch`', async () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control type="email" required />
              <Field.Error data-testid="error" />
            </Field.Root>
          ));

          const control = screen.getByRole('textbox');
          const message = screen.queryByTestId('error');

          expect(message).to.equal(null);

          fireEvent.focus(control);
          fireEvent.blur(control);

          expect(control).not.to.have.attribute('aria-invalid');

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: 'tt' } });
          fireEvent.blur(control);

          expect(control).to.have.attribute('aria-invalid', 'true');

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: '' } });
          fireEvent.blur(control);

          expect(control).to.have.attribute('aria-invalid', 'true');

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: 'email@email.com' } });
          fireEvent.blur(control);

          expect(control).not.to.have.attribute('aria-invalid');
        });

        it('clears valueMissing on change but defers other native errors like typeMismatch until blur when both are active', async () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control type="email" required data-testid="control" />
              <Field.Error data-testid="error" />
            </Field.Root>
          ));

          const control = screen.getByTestId('control');

          fireEvent.focus(control);
          fireEvent.blur(control);
          expect(control).not.to.have.attribute('aria-invalid', 'true');
          expect(screen.queryByTestId('error')).to.equal(null);

          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: 'a' } });
          fireEvent.change(control, { target: { value: '' } });
          fireEvent.blur(control);

          expect(control).to.have.attribute('aria-invalid', 'true');
          expect(screen.getByTestId('error')).not.to.equal(null);

          fireEvent.focus(control);
          fireEvent.input(control, { target: { value: 't' } });

          // The field becomes temporarily valid because only 'valueMissing' is checked for immediate clearing.
          // Other errors like 'typeMismatch' are deferred to the next blur/submit.
          expect(control).not.to.have.attribute('aria-invalid', 'true');
          expect(screen.queryByTestId('error')).to.equal(null);

          fireEvent.blur(control);

          expect(control).to.have.attribute('aria-invalid', 'true');
          expect(screen.getByTestId('error')).not.to.equal(null);
          expect(screen.getByTestId('error').textContent).not.to.equal('');

          fireEvent.focus(control);
          fireEvent.input(control, { target: { value: 'test@example.com' } });

          expect(control).not.to.have.attribute('aria-invalid', 'true');
          expect(screen.queryByTestId('error')).to.equal(null);

          fireEvent.blur(control);

          expect(control).not.to.have.attribute('aria-invalid', 'true');
          expect(screen.queryByTestId('error')).to.equal(null);
        });
      });

      describe('computed validity state', () => {
        it('should not mark field as invalid for valueMissing if not dirty', () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control data-testid="control" required />
            </Field.Root>
          ));

          const control = screen.getByTestId('control');

          fireEvent.focus(control);
          fireEvent.blur(control);

          expect(control).not.to.have.attribute('data-invalid');
          expect(control).not.to.have.attribute('aria-invalid');
        });

        it('should mark field as invalid for valueMissing if dirty', () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control data-testid="control" required />
            </Field.Root>
          ));

          const control = screen.getByTestId('control');

          // Mark as touched and dirtied
          fireEvent.focus(control);
          fireEvent.change(control, { target: { value: 'a' } });
          fireEvent.change(control, { target: { value: '' } });
          fireEvent.blur(control);

          // valueMissing is true, and markedDirtyRef is true, so valid should be false
          expect(control).to.have.attribute('data-invalid', '');
          expect(control).to.have.attribute('aria-invalid', 'true');
        });

        it('should mark field as invalid for other errors (e.g., typeMismatch) even if not dirty', () => {
          render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control data-testid="control" type="email" defaultValue="not_an_email@" />
            </Field.Root>
          ));

          const control = screen.getByTestId('control');

          // Mark as touched but not dirty
          fireEvent.focus(control);
          fireEvent.blur(control);

          // typeMismatch is true, so valid should be false regardless of dirty state
          expect(control).to.have.attribute('data-invalid', '');
          expect(control).to.have.attribute('aria-invalid', 'true');
        });
      });
    });
  });

  describe('prop: validateDebounceTime', () => {
    const { clock, render: renderFakeTimers } = createRenderer();

    clock.withFakeTimers();

    it('should debounce validation', async () => {
      renderFakeTimers(() => (
        <Field.Root
          validationDebounceTime={100}
          validationMode="onChange"
          validate={(value) => {
            const str = value as string;
            return str.length < 3 ? 'error' : null;
          }}
        >
          <Field.Control />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole<HTMLInputElement>('textbox');
      const message = screen.queryByText('error');

      expect(message).to.equal(null);

      fireEvent.input(control, { target: { value: 't' } });

      expect(control).not.to.have.attribute('aria-invalid');

      clock.tick(99);

      fireEvent.input(control, { target: { value: 'te' } });

      clock.tick(99);

      expect(control).not.to.have.attribute('aria-invalid');

      clock.tick(1);

      expect(control).to.have.attribute('aria-invalid', 'true');
      expect(screen.queryByText('error')).not.to.equal(null);
    });
  });

  describe('style hooks', () => {
    describe('touched', () => {
      it('should apply [data-touched] style hook to all components when touched', async () => {
        render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');
        const error = screen.queryByTestId('error');

        expect(root).not.to.have.attribute('data-touched');
        expect(control).not.to.have.attribute('data-touched');
        expect(label).not.to.have.attribute('data-touched');
        expect(description).not.to.have.attribute('data-touched');
        expect(error).to.equal(null);

        fireEvent.focus(control);
        fireEvent.blur(control);

        expect(root).to.have.attribute('data-touched', '');
        expect(control).to.have.attribute('data-touched', '');
        expect(label).to.have.attribute('data-touched', '');
        expect(description).to.have.attribute('data-touched', '');
        expect(error).to.equal(null);
      });
    });

    describe('dirty', () => {
      it('should apply [data-dirty] style hook to all components when dirty', async () => {
        render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-dirty');
        expect(control).not.to.have.attribute('data-dirty');
        expect(label).not.to.have.attribute('data-dirty');
        expect(description).not.to.have.attribute('data-dirty');

        fireEvent.change(control, { target: { value: 'value' } });

        expect(root).to.have.attribute('data-dirty', '');
        expect(control).to.have.attribute('data-dirty', '');
        expect(label).to.have.attribute('data-dirty', '');
        expect(description).to.have.attribute('data-dirty', '');

        fireEvent.change(control, { target: { value: '' } });

        expect(root).not.to.have.attribute('data-dirty');
        expect(control).not.to.have.attribute('data-dirty');
        expect(label).not.to.have.attribute('data-dirty');
        expect(description).not.to.have.attribute('data-dirty');
      });
    });

    describe('filled', () => {
      it('should apply [data-filled] style hook to all components when filled', () => {
        render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-filled');
        expect(control).not.to.have.attribute('data-filled');
        expect(label).not.to.have.attribute('data-filled');
        expect(description).not.to.have.attribute('data-filled');

        fireEvent.change(control, { target: { value: 'value' } });

        expect(root).to.have.attribute('data-filled', '');
        expect(control).to.have.attribute('data-filled', '');
        expect(label).to.have.attribute('data-filled', '');
        expect(description).to.have.attribute('data-filled', '');

        fireEvent.change(control, { target: { value: '' } });

        expect(root).not.to.have.attribute('data-filled');
        expect(control).not.to.have.attribute('data-filled');
        expect(label).not.to.have.attribute('data-filled');
        expect(description).not.to.have.attribute('data-filled');
      });

      it('changes [data-filled] when the value is changed externally', async () => {
        function App() {
          const [value, setValue] = createSignal('');
          return (
            <div>
              <Field.Root>
                <Field.Control value={value()} onChange={(event) => setValue(event.target.value)} />
              </Field.Root>
              <button onClick={() => setValue('test')}>change</button>
              <button onClick={() => setValue('')}>reset</button>
            </div>
          );
        }

        const { user } = render(() => <App />);

        expect(screen.getByRole('textbox')).not.to.have.attribute('data-filled', '');

        await user.click(screen.getByRole('button', { name: 'change' }));
        expect(screen.getByRole('textbox')).to.have.attribute('data-filled', '');

        await user.click(screen.getByRole('button', { name: 'reset' }));
        expect(screen.getByRole('textbox')).not.to.have.attribute('data-filled', '');
      });
    });

    describe('focused', () => {
      it('should apply [data-focused] style hook to all components when focused', async () => {
        render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId('root');
        const control = screen.getByTestId('control');
        const label = screen.getByTestId('label');
        const description = screen.getByTestId('description');

        expect(root).not.to.have.attribute('data-focused');
        expect(control).not.to.have.attribute('data-focused');
        expect(label).not.to.have.attribute('data-focused');
        expect(description).not.to.have.attribute('data-focused');

        fireEvent.focus(control);

        expect(root).to.have.attribute('data-focused', '');
        expect(control).to.have.attribute('data-focused', '');
        expect(label).to.have.attribute('data-focused', '');
        expect(description).to.have.attribute('data-focused', '');

        fireEvent.blur(control);

        expect(root).not.to.have.attribute('data-focused');
        expect(control).not.to.have.attribute('data-focused');
        expect(label).not.to.have.attribute('data-focused');
        expect(description).not.to.have.attribute('data-focused');
      });
    });
  });

  describe('defaultValue behavior', () => {
    it('should not reset to defaultValue when input value is programmatically changed and then focused', async () => {
      let inputRef!: HTMLInputElement;

      render(() => (
        <Field.Root>
          <Field.Control ref={inputRef} defaultValue="foo" data-testid="input" />
        </Field.Root>
      ));

      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(input.value).to.equal('foo');

      if (inputRef) {
        inputRef.value = '';
      }

      expect(input.value).to.equal('');

      fireEvent.focus(input);

      expect(input.value).to.equal('');
    });

    it('should not reset to defaultValue when input value is programmatically changed to non-empty value and then focused', () => {
      let inputRef!: HTMLInputElement;

      render(() => (
        <Field.Root>
          <Field.Control ref={inputRef} defaultValue="foo" data-testid="input" />
        </Field.Root>
      ));

      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(input.value).to.equal('foo');

      if (inputRef) {
        inputRef.value = 'abc';
      }

      expect(input.value).to.equal('abc');

      fireEvent.focus(input);

      expect(input.value).to.equal('abc');
    });
  });

  describe('prop: dirty', () => {
    it('controls the dirty state', () => {
      render(() => (
        <Field.Root data-testid="root" dirty>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="description" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      ['root', 'control', 'label', 'description'].forEach((part) => {
        expect(screen.getByTestId(part)).to.have.attribute('data-dirty');
      });
    });
  });

  describe('prop: touched', () => {
    it('controls the touched state', () => {
      render(() => (
        <Field.Root data-testid="root" touched>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="description" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      ['root', 'control', 'label', 'description'].forEach((part) => {
        expect(screen.getByTestId(part)).to.have.attribute('data-touched');
      });
    });
  });

  describe('actionsRef', () => {
    it('validates the field when the `validate` method is called', async () => {
      function App() {
        let actionsRef = null as Field.Root.Actions | null;
        return (
          <div>
            <Field.Root name="username" actionsRef={actionsRef}>
              <Field.Control defaultValue="" required />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="button" onClick={() => actionsRef?.validate()}>
              validate
            </button>
          </div>
        );
      }

      const { user } = render(() => <App />);

      expect(screen.queryByTestId('error')).to.equal(null);

      await user.click(screen.getByText('validate'));

      expect(screen.queryByTestId('error')).to.not.equal(null);
    });
  });
});
