import { createRenderer } from '#test-utils';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import { screen } from '@mui/internal-test-utils';
import { createSignal } from 'solid-js';
import { expect } from 'vitest';

interface TestCaseProps {
  open: boolean;
}

function TestCase(props: TestCaseProps) {
  return (
    <Drawer.Provider>
      <Drawer.IndentBackground data-testid="bg" />
      <Drawer.Root open={props.open}>
        <Drawer.Trigger>Open</Drawer.Trigger>
      </Drawer.Root>
    </Drawer.Provider>
  );
}

describe('<Drawer.IndentBackground />', () => {
  const { render } = createRenderer();

  it('sets data-active when any drawer is open', async () => {
    const [open, setOpen] = createSignal(false);
    render(() => <TestCase open={open()} />);

    const background = screen.getByTestId('bg');

    expect(background.getAttribute('data-inactive')).toBe('');
    expect(background.getAttribute('data-active')).toBeNull();

    setOpen(true);

    expect(background.getAttribute('data-active')).toBe('');
    expect(background.getAttribute('data-inactive')).toBeNull();
  });
});
