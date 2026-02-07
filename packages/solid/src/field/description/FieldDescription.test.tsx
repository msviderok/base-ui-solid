import { createRenderer, describeConformance } from '#test-utils';
import { Field } from '@msviderok/base-ui-solid/field';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Field.Description />', () => {
  const { render } = createRenderer();

  describeConformance(Field.Description, () => ({
    refInstanceof: window.HTMLParagraphElement,
    render: (node, props) => render(() => <Field.Root>{node(props!)}</Field.Root>),
  }));

  it('should set aria-describedby on the control automatically', () => {
    render(() => (
      <Field.Root>
        <Field.Control />
        <Field.Description>Message</Field.Description>
      </Field.Root>
    ));

    expect(screen.getByRole('textbox')).to.have.attribute(
      'aria-describedby',
      screen.getByText('Message').id,
    );
  });
});
