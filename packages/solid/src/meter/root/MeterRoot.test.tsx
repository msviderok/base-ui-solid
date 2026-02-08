import { createRenderer, describeConformance } from '#test-utils';
import { Meter } from '@msviderok/base-ui-solid/meter';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';

describe('<Meter.Root />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props) => <Meter.Root value={50} {...props} ref={props.ref} />,
    () => ({ render, refInstanceof: window.HTMLDivElement }),
  );

  describe('ARIA attributes', () => {
    it('sets the correct aria attributes', async () => {
      render(() => (
        <Meter.Root value={30}>
          <Meter.Label>Battery Level</Meter.Label>
          <Meter.Track>
            <Meter.Indicator />
          </Meter.Track>
        </Meter.Root>
      ));

      const meter = screen.getByRole('meter');

      expect(meter).to.have.attribute('aria-valuenow', '30');
      expect(meter).to.have.attribute('aria-valuemin', '0');
      expect(meter).to.have.attribute('aria-valuemax', '100');
      expect(meter).to.have.attribute('aria-valuetext', '30%');
      expect(meter.getAttribute('aria-labelledby')).to.equal(
        screen.getByText('Battery Level').getAttribute('id'),
      );
    });

    it('should update aria-valuenow when value changes', async () => {
      const [value, setValue] = createSignal(50);
      render(() => (
        <Meter.Root value={value()}>
          <Meter.Track>
            <Meter.Indicator />
          </Meter.Track>
        </Meter.Root>
      ));
      const meter = screen.getByRole('meter');
      setValue(77);
      expect(meter).to.have.attribute('aria-valuenow', '77');
    });
  });

  describe('prop: format', () => {
    it('formats the value', async () => {
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }
      render(() => (
        <Meter.Root value={30} format={format}>
          <Meter.Value data-testid="value" />
          <Meter.Track>
            <Meter.Indicator />
          </Meter.Track>
        </Meter.Root>
      ));
      const value = screen.getByTestId('value');
      const meter = screen.getByRole('meter');
      expect(value).to.have.text(formatValue(30));
      expect(meter).to.have.attribute('aria-valuetext', formatValue(30));
    });
  });

  describe('prop: locale', () => {
    it('sets the locale when formatting the value', async () => {
      // In German locale, numbers use dot as thousands separator and comma as decimal separator
      const expectedValue = new Intl.NumberFormat('de-DE').format(86.49);
      render(() => (
        <Meter.Root
          value={86.49}
          format={{
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}
          locale="de-DE"
        >
          <Meter.Value data-testid="value" />
        </Meter.Root>
      ));

      expect(screen.getByTestId('value')).to.have.text(expectedValue);
    });
  });
});
