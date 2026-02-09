import { createRenderer, describeConformance } from '#test-utils';
import { Progress } from '@msviderok/base-ui-solid/progress';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';

describe('<Progress.Value />', () => {
  const { render } = createRenderer();

  describeConformance(Progress.Value, () => ({
    render: (node, props) => render(() => <Progress.Root value={40}>{node(props!)}</Progress.Root>),
    refInstanceof: window.HTMLSpanElement,
  }));

  describe('prop: children', () => {
    it('renders the value when children is not provided', async () => {
      render(() => (
        <Progress.Root value={30}>
          <Progress.Value data-testid="value" />
        </Progress.Root>
      ));

      const value = screen.getByTestId('value');
      expect(value).to.have.text((0.3).toLocaleString(undefined, { style: 'percent' }));
    });

    it('renders a formatted value when a format is provided', async () => {
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
        </Progress.Root>
      ));

      const value = screen.getByTestId('value');
      expect(value).to.have.text(formatValue(30));
    });

    describe('it accepts a render function', () => {
      it('numerical value', async () => {
        const renderSpy = spy();
        const format: Intl.NumberFormatOptions = {
          style: 'currency',
          currency: 'USD',
        };
        function formatValue(v: number) {
          return new Intl.NumberFormat(undefined, format).format(v);
        }
        render(() => (
          <Progress.Root value={30} format={format}>
            <Progress.Value data-testid="value">{renderSpy}</Progress.Value>
          </Progress.Root>
        ));
        expect(renderSpy.lastCall.args[0]).to.deep.equal(formatValue(30));
        expect(renderSpy.lastCall.args[1]).to.deep.equal(30);
      });

      it('indeterminate value', async () => {
        const renderSpy = spy();
        const format: Intl.NumberFormatOptions = {
          style: 'currency',
          currency: 'USD',
        };
        render(() => (
          <Progress.Root value={null} format={format}>
            <Progress.Value data-testid="value">{renderSpy}</Progress.Value>
          </Progress.Root>
        ));
        expect((renderSpy.lastCall as any).proxy.args[0][0]).to.deep.equal('indeterminate');
        expect((renderSpy.lastCall as any).proxy.args[0][1]).to.deep.equal(null);
      });
    });
  });
});
