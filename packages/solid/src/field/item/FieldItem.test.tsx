import { createRenderer } from '#test-utils';
import { Checkbox } from '@msviderok/base-ui-solid/checkbox';
import { CheckboxGroup } from '@msviderok/base-ui-solid/checkbox-group';
import { Field } from '@msviderok/base-ui-solid/field';
import { Radio } from '@msviderok/base-ui-solid/radio';
import { RadioGroup } from '@msviderok/base-ui-solid/radio-group';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { describeConformance } from '../../../test/describeConformance';

describe('<Field.Item />', () => {
  const { render } = createRenderer();

  describeConformance(Field.Item, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Field.Root>{node(props!)}</Field.Root>);
    },
  }));

  describe('prop: disabled', () => {
    it('disables a wrapped checkbox', async () => {
      const onValueChange = spy();
      const { user } = render(() => (
        <Field.Root name="apple">
          <CheckboxGroup defaultValue={[]} onValueChange={onValueChange}>
            <Field.Item disabled>
              <Checkbox.Root value="fuji-apple" />
            </Field.Item>
            <Field.Item>
              <Checkbox.Root value="gala-apple" />
            </Field.Item>
          </CheckboxGroup>
        </Field.Root>
      ));
      const [checkbox1, checkbox2] = screen.getAllByRole('checkbox');
      await user.click(checkbox1);
      expect(onValueChange.callCount).to.equal(0);
      await user.click(checkbox2);
      expect(onValueChange.callCount).to.equal(1);
    });

    it('disables a wrapped radio', async () => {
      const onValueChange = spy();
      const { user } = render(() => (
        <Field.Root name="apple">
          <RadioGroup defaultValue="" onValueChange={onValueChange}>
            <Field.Item disabled>
              <Radio.Root value="fuji-apple" />
            </Field.Item>
            <Field.Item>
              <Radio.Root value="gala-apple" />
            </Field.Item>
          </RadioGroup>
        </Field.Root>
      ));
      const [radio1, radio2] = screen.getAllByRole('radio');
      await user.click(radio1);
      expect(onValueChange.callCount).to.equal(0);
      await user.click(radio2);
      expect(onValueChange.callCount).to.equal(1);
    });
  });
});
