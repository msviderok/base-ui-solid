import { createRenderer, describeConformance } from '#test-utils';
import { Fieldset } from '@msviderok/base-ui-solid/fieldset';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Fieldset.Legend />', () => {
  const { render } = createRenderer();

  describeConformance(Fieldset.Legend, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) => render(() => <Fieldset.Root>{node(props!)}</Fieldset.Root>),
  }));

  it('should set aria-labelledby on the fieldset automatically', () => {
    render(() => (
      <Fieldset.Root>
        <Fieldset.Legend data-testid="legend">Legend</Fieldset.Legend>
      </Fieldset.Root>
    ));

    expect(screen.getByRole('group')).to.have.attribute(
      'aria-labelledby',
      screen.getByTestId('legend').id,
    );
  });

  it('should set aria-labelledby on the fieldset with custom id', () => {
    render(() => (
      <Fieldset.Root>
        <Fieldset.Legend id="legend-id" />
      </Fieldset.Root>
    ));

    expect(screen.getByRole('group')).to.have.attribute('aria-labelledby', 'legend-id');
  });
});
