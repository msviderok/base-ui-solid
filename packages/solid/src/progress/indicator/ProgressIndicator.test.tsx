import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Progress } from '@msviderok/base-ui-solid/progress';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Progress.Indicator />', () => {
  const { render } = createRenderer();

  describeConformance(Progress.Indicator, () => ({
    render: (node, props) => render(() => <Progress.Root value={40}>{node(props!)}</Progress.Root>),
    refInstanceof: window.HTMLDivElement,
  }));

  describe.skipIf(isJSDOM)('internal styles', () => {
    it('determinate', async () => {
      render(() => (
        <Progress.Root value={33}>
          <Progress.Track>
            <Progress.Indicator data-testid="indicator" render="span" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({
        insetInlineStart: '0px',
        width: '33%',
      });
    });

    it('sets zero width when value is 0', async () => {
      render(() => (
        <Progress.Root value={0}>
          <Progress.Track>
            <Progress.Indicator data-testid="indicator" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({
        insetInlineStart: '0px',
        width: '0px',
      });
    });

    it('indeterminate', async () => {
      render(() => (
        <Progress.Root value={null}>
          <Progress.Track>
            <Progress.Indicator data-testid="indicator" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({});
    });
  });
});
