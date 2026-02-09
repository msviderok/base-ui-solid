import { createRenderer, describeConformance } from '#test-utils';
import { NumberField } from '@msviderok/base-ui-solid/number-field';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<NumberField.Group />', () => {
  const { render } = createRenderer();

  describeConformance(NumberField.Group, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) => render(() => <NumberField.Root>{node(props!)}</NumberField.Root>),
  }));

  it('has role prop', () => {
    render(() => (
      <NumberField.Root>
        <NumberField.Group />
      </NumberField.Root>
    ));
    expect(screen.queryByRole('group')).not.to.equal(null);
  });
});
