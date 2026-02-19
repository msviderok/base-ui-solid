import { createRenderer } from '#test-utils';
import { DrawerPreview as Drawer } from '@msviderok/base-ui-solid/drawer';
import { screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';

interface TestCaseProps {
  open: boolean;
}

function TestCase(props: TestCaseProps) {
  return (
    <Drawer.Provider>
      <Drawer.IndentBackground data-testid="bg" />
      <Drawer.Indent data-testid="indent">
        <Drawer.Root open={props.open}>
          <Drawer.Trigger>Open</Drawer.Trigger>
        </Drawer.Root>
      </Drawer.Indent>
    </Drawer.Provider>
  );
}

describe('<Drawer.Indent />', () => {
  const { render } = createRenderer();

  it('sets data-active when any drawer is open', async () => {
    const [open, setOpen] = createSignal(false);
    render(() => <TestCase open={open()} />);

    expect(screen.getByTestId('indent')).toHaveAttribute('data-inactive', '');
    expect(screen.getByTestId('indent')).not.toHaveAttribute('data-active');

    setOpen(true);

    expect(screen.getByTestId('indent')).toHaveAttribute('data-active', '');
    expect(screen.getByTestId('indent')).not.toHaveAttribute('data-inactive');
    expect(screen.getByTestId('bg')).toHaveAttribute('data-active', '');
  });
});
