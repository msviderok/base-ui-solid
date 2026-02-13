import { createRenderer, describeConformance } from '#test-utils';
import { Select } from '@msviderok/base-ui-solid/select';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';

describe('<Select.Group />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Group, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Select.Root open>{node(props!)}</Select.Root>);
    },
  }));

  it('should render group with label', async () => {
    render(() => (
      <Select.Root open>
        <Select.Positioner>
          <Select.Group>
            <Select.GroupLabel>Fruits</Select.GroupLabel>
            <Select.Item value="apple">Apple</Select.Item>
            <Select.Item value="banana">Banana</Select.Item>
          </Select.Group>
        </Select.Positioner>
      </Select.Root>
    ));

    expect(screen.getByRole('group')).to.have.attribute('aria-labelledby');
    expect(screen.getByText('Fruits')).toBeVisible();
  });

  it('should associate label with group', async () => {
    render(() => (
      <Select.Root open>
        <Select.Positioner>
          <Select.Group>
            <Select.GroupLabel>Vegetables</Select.GroupLabel>
            <Select.Item value="carrot">Carrot</Select.Item>
            <Select.Item value="lettuce">Lettuce</Select.Item>
          </Select.Group>
        </Select.Positioner>
      </Select.Root>
    ));

    const Group = screen.getByRole('group');
    const label = screen.getByText('Vegetables');
    expect(Group).to.have.attribute('aria-labelledby', label.id);
  });
});
