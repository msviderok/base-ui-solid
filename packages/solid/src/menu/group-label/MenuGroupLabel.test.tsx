import { createRenderer, describeConformance } from '#test-utils';
import { Menu } from '@msviderok/base-ui-solid/menu';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { MenuGroupContext } from '../group/MenuGroupContext';

const testContext: MenuGroupContext = {
  setLabelId: () => undefined,
};

describe('<Menu.GroupLabel />', () => {
  const { render } = createRenderer();

  describeConformance(Menu.GroupLabel, () => ({
    render: (node, props) =>
      render(() => (
        <MenuGroupContext.Provider value={testContext}>{node(props!)}</MenuGroupContext.Provider>
      )),
    refInstanceof: window.HTMLDivElement,
  }));

  describe('a11y attributes', () => {
    it('should have the role `presentation`', async () => {
      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Group>
                  <Menu.GroupLabel>Test group</Menu.GroupLabel>
                </Menu.Group>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const groupLabel = screen.getByText('Test group');
      expect(groupLabel).to.have.attribute('role', 'presentation');
    });

    it("should reference the generated id in Group's `aria-labelledby`", async () => {
      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Group>
                  <Menu.GroupLabel>Test group</Menu.GroupLabel>
                </Menu.Group>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const group = screen.getByRole('group');
      const groupLabel = screen.getByText('Test group');

      expect(group).to.have.attribute('aria-labelledby', groupLabel.id);
    });

    it("should reference the provided id in Group's `aria-labelledby`", async () => {
      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Group>
                  <Menu.GroupLabel id="test-group">Test group</Menu.GroupLabel>
                </Menu.Group>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const group = screen.getByRole('group');
      expect(group).to.have.attribute('aria-labelledby', 'test-group');
    });
  });
});
