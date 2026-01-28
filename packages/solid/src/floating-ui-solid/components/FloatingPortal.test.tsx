import { flushMicrotasks } from '#test-utils';
import { isJSDOM } from '@base-ui/utils/detectBrowser';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal, onMount } from 'solid-js';
import { FloatingPortalLite } from '../../utils/FloatingPortalLite';
import { FloatingPortal, useFloating } from '../index';
import type { UseFloatingPortalNodeProps } from './FloatingPortal';

interface AppProps {
  container?: UseFloatingPortalNodeProps['container'];
}

function App(props: AppProps) {
  const [open, setOpen] = createSignal(false);
  const { refs } = useFloating({
    open,
    onOpenChange: setOpen,
  });

  return (
    <>
      <button data-testid="reference" ref={refs.setReference} onClick={() => setOpen((v) => !v)} />
      <FloatingPortal {...props}>
        {open() && <div ref={refs.setFloating} data-testid="floating" />}
      </FloatingPortal>
    </>
  );
}

describe.skipIf(!isJSDOM)('FloatingPortal', () => {
  test('allows custom containers', async () => {
    const customRoot = document.createElement('div');
    customRoot.id = 'custom-root';
    document.body.appendChild(customRoot);
    render(() => <App container={customRoot} />);
    fireEvent.click(screen.getByTestId('reference'));

    await flushMicrotasks();

    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(customRoot);
    customRoot.remove();
  });

  test('allows refs as containers', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    render(() => <App container={el} />);
    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();
    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(el);
    document.body.removeChild(el);
  });

  /**
   * TODO (enhancement): this test should not rely on the rendering mechanism of the framework but
   * on the logic of having state without root initially and then setting it to a value.
   * Smth like click on a button to render the root should be flexible enough to test this on all frameworks.
   */
  test('allows containers to be initially null', async () => {
    function RootApp() {
      const [container, setContainer] = createSignal<HTMLElement | null>(null);
      const [renderContainer, setRenderContainer] = createSignal(false);

      onMount(() => {
        setRenderContainer(true);
      });

      return (
        <>
          {renderContainer() && <div ref={setContainer} data-testid="root" />}
          <App container={container()} />
        </>
      );
    }

    render(() => <RootApp />);

    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();
    const subRoot = screen.getByTestId('floating').parentElement;
    const root = screen.getByTestId('root');
    expect(root).toBe(subRoot?.parentElement);
  });

  test('reattaches the portal when the container changes', async () => {
    const customRoot = document.createElement('div');
    document.body.appendChild(customRoot);

    try {
      function RootSwitcher() {
        const [container, setContainer] =
          createSignal<UseFloatingPortalNodeProps['container']>(null);

        return (
          <>
            <App container={container()} />
            <button onClick={() => setContainer(undefined)} data-testid="use-undefined" />
            <button onClick={() => setContainer(customRoot)} data-testid="use-element" />
          </>
        );
      }

      render(() => <RootSwitcher />);

      fireEvent.click(screen.getByTestId('reference'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(
        document.body,
      );

      fireEvent.click(screen.getByTestId('use-element'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(customRoot);

      fireEvent.click(screen.getByTestId('use-undefined'));

      const floatingInBodyAgain = await screen.findByTestId('floating');
      expect(floatingInBodyAgain.parentElement?.parentElement).toBe(document.body);
      expect(customRoot.contains(floatingInBodyAgain)).toBe(false);
    } finally {
      customRoot.remove();
    }
  });

  test('forwards HTML props to the portal element', async () => {
    render(() => (
      <FloatingPortal data-testid="portal-element" class="closed">
        <div />
      </FloatingPortal>
    ));

    await flushMicrotasks();

    const portal = document.querySelector('[data-testid="portal-element"]') as HTMLElement | null;
    expect(portal).not.toBeNull();
    expect(portal).toHaveClass('closed');
    expect(portal).toHaveAttribute('data-base-ui-portal');
  });

  test('FloatingPortalLite forwards HTML props to the portal element', async () => {
    render(() => (
      <FloatingPortalLite data-testid="lite-portal">
        <div />
      </FloatingPortalLite>
    ));

    await flushMicrotasks();

    const portal = document.querySelector('[data-testid="lite-portal"]');
    expect(portal).not.toBeNull();
  });
});
