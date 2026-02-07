import { createRenderer, describeConformance } from '#test-utils';
import { Field } from '@msviderok/base-ui-solid/field';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Field.Label />', () => {
  const { render } = createRenderer();

  describeConformance(Field.Label, () => ({
    refInstanceof: window.HTMLLabelElement,
    render: (node, props) => render(() => <Field.Root>{node(props!)}</Field.Root>),
  }));

  it('should set htmlFor referencing the control automatically', () => {
    render(() => (
      <Field.Root data-testid="field">
        <Field.Control />
        <Field.Label data-testid="label">Label</Field.Label>
      </Field.Root>
    ));

    expect(screen.getByTestId('label')).to.have.attribute('for', screen.getByRole('textbox').id);
  });
});
