import { createRenderer, describeConformance } from '#test-utils';
import { Progress } from '@msviderok/base-ui-solid/progress';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal } from 'solid-js';
import type { ProgressRoot } from './ProgressRoot';

function TestProgress(props: ProgressRoot.Props) {
  return (
    <Progress.Root {...props}>
      <Progress.Track>
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
  );
}

describe('<Progress.Root />', () => {
  const { render } = createRenderer();

  describeConformance(
    (props: any) => <Progress.Root {...props} ref={props.ref} value={50} />,
    () => ({
      render,
      refInstanceof: window.HTMLDivElement,
    }),
  );

  describe('ARIA attributes', () => {
    it('sets the correct aria attributes', async () => {
      render(() => (
        <Progress.Root value={30}>
          <Progress.Label>Downloading</Progress.Label>
          <Progress.Value />
          <Progress.Track>
            <Progress.Indicator />
          </Progress.Track>
        </Progress.Root>
      ));

      const progressbar = screen.getByRole('progressbar');
      const label = screen.getByText('Downloading');

      expect(progressbar).to.have.attribute('aria-valuenow', '30');
      expect(progressbar).to.have.attribute('aria-valuemin', '0');
      expect(progressbar).to.have.attribute('aria-valuemax', '100');
      expect(progressbar).to.have.attribute(
        'aria-valuetext',
        (0.3).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(progressbar.getAttribute('aria-labelledby')).to.equal(label.getAttribute('id'));
    });

    it('should update aria-valuenow when value changes', async () => {
      const [value, setValue] = createSignal(50);
      render(() => <TestProgress value={value()} />);
      const progressbar = screen.getByRole('progressbar');
      setValue(77);
      expect(progressbar).to.have.attribute('aria-valuenow', '77');
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
        <Progress.Root value={30} format={format}>
          <Progress.Value data-testid="value" />
          <Progress.Track>
            <Progress.Indicator />
          </Progress.Track>
        </Progress.Root>
      ));

      const value = screen.getByTestId('value');
      const progressbar = screen.getByRole('progressbar');
      expect(value).to.have.text(formatValue(30));
      expect(progressbar).to.have.attribute('aria-valuetext', formatValue(30));
    });
  });

  describe('prop: locale', () => {
    it('sets the locale when formatting the value', async () => {
      // In German locale, numbers use dot as thousands separator and comma as decimal separator
      const expectedValue = new Intl.NumberFormat('de-DE').format(70.51);

      render(() => (
        <Progress.Root
          value={70.51}
          format={{
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}
          locale="de-DE"
        >
          <Progress.Value data-testid="value" />
        </Progress.Root>
      ));

      expect(screen.getByTestId('value')).to.have.text(expectedValue);
    });
  });
});
