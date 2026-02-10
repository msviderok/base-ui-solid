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

describe('<Toolbar.Group />', () => {
  const { render } = createRenderer();

  describeConformance(Toolbar.Group, () => ({
    refInstanceof: window.HTMLDivElement,
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
    it('renders a group', async () => {
      render(() => (
        <Toolbar.Root>
          <Toolbar.Group data-testid="group" />
        </Toolbar.Root>
      ));

      expect(screen.getByTestId('group')).to.equal(screen.getByRole('group'));
    });
  });

  describe('prop: disabled', () => {
    it('disables all toolbar items except links in the group', async () => {
      render(() => (
        <Toolbar.Root>
          <Toolbar.Group disabled>
            <Toolbar.Button />
            <Toolbar.Link href="https://base-ui.com">Link</Toolbar.Link>
            <Toolbar.Input defaultValue="" />
          </Toolbar.Group>
        </Toolbar.Root>
      ));

      [screen.getByRole('button'), screen.getByRole('textbox')].forEach((toolbarItem) => {
        expect(toolbarItem).to.have.attribute('aria-disabled', 'true');
        expect(toolbarItem).to.have.attribute('data-disabled');
      });

      expect(screen.getByText('Link')).to.not.have.attribute('data-disabled');
      expect(screen.getByText('Link')).to.not.have.attribute('aria-disabled');
    });
  });
});
