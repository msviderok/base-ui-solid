import { createRenderer, describeConformance } from '#test-utils';
import { Toolbar } from '@msviderok/base-ui-solid/toolbar';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { CompositeRootContext } from '../../composite/root/CompositeRootContext';
import { NOOP } from '../../utils/noop';
import { ToolbarRootContext } from '../root/ToolbarRootContext';

const testCompositeContext: CompositeRootContext = {
  highlightedIndex: () => 0,
  onHighlightedIndexChange: NOOP,
  highlightItemOnHover: () => false,
  relayKeyboardEvent: NOOP,
};

const testToolbarContext: ToolbarRootContext = {
  disabled: () => false,
  orientation: () => 'horizontal',
  setItemArray: NOOP,
};

describe('<Toolbar.Link />', () => {
  const { render } = createRenderer();

  describeConformance(Toolbar.Link, () => ({
    refInstanceof: window.HTMLAnchorElement,
    testRenderPropWith: 'a',
    render: (node, props) => {
      return render(() => (
        <ToolbarRootContext.Provider value={testToolbarContext}>
          <CompositeRootContext.Provider value={testCompositeContext}>
            {node(props!)}
          </CompositeRootContext.Provider>
        </ToolbarRootContext.Provider>
      ));
    },
  }));

  describe('ARIA attributes', () => {
    it('renders an anchor', async () => {
      render(() => (
        <Toolbar.Root>
          <Toolbar.Link data-testid="link" href="https://base-ui.com" />
        </Toolbar.Root>
      ));

      expect(screen.getByTestId('link')).to.equal(screen.getByRole('link'));
    });
  });
});
