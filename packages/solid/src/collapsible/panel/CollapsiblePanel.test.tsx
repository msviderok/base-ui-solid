import { createRenderer, describeConformance, flushMicrotasks, isJSDOM } from '#test-utils';
import { Collapsible } from '@msviderok/base-ui-solid/collapsible';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal } from 'solid-js';
import { afterEach } from 'vitest';

const PANEL_CONTENT = 'This is panel content';

describe('<Collapsible.Panel />', () => {
  const { render } = createRenderer();

  describeConformance(Collapsible.Panel, () => ({
    refInstanceof: window.HTMLDivElement,
    render: (node, props) => {
      return render(() => <Collapsible.Root defaultOpen>{node(props!)}</Collapsible.Root>);
    },
  }));

  describe('prop: keepMounted', () => {
    it('does not unmount the panel when true', async () => {
      function App() {
        const [open, setOpen] = createSignal(false);
        return (
          <Collapsible.Root open={open()} onOpenChange={setOpen}>
            <Collapsible.Trigger />
            <Collapsible.Panel keepMounted>{PANEL_CONTENT}</Collapsible.Panel>
          </Collapsible.Root>
        );
      }

      render(() => <App />);

      const trigger = screen.getByRole('button');

      expect(trigger).to.have.attribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).to.not.equal(null);
      expect(screen.queryByText(PANEL_CONTENT)).not.toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).to.have.attribute('data-closed');

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(trigger).to.have.attribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).to.equal(
        screen.queryByText(PANEL_CONTENT)?.getAttribute('id'),
      );

      expect(screen.queryByText(PANEL_CONTENT)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).to.have.attribute('data-open');
      expect(trigger).to.have.attribute('data-panel-open');

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(trigger).to.have.attribute('aria-expanded', 'false');
      expect(trigger.getAttribute('aria-controls')).to.equal(null);
      expect(screen.queryByText(PANEL_CONTENT)).not.toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).to.have.attribute('data-closed');
    });
  });

  // we test firefox in browserstack which does not support this yet
  describe.skipIf(!('onbeforematch' in window) || isJSDOM)('prop: hiddenUntilFound', () => {
    it('uses `hidden="until-found" to hide panel when true', () => {
      const handleOpenChange = spy();

      render(() => (
        <Collapsible.Root defaultOpen={false} onOpenChange={handleOpenChange}>
          <Collapsible.Trigger />
          <Collapsible.Panel hiddenUntilFound keepMounted>
            {PANEL_CONTENT}
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const panel = screen.queryByText(PANEL_CONTENT);

      const event = new window.Event('beforematch', {
        bubbles: true,
        cancelable: false,
      });
      panel?.dispatchEvent(event);

      expect(handleOpenChange.callCount).to.equal(1);
      expect(panel).to.have.attribute('data-open');
    });
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      const style = `
        .animation-test-panel {
          transition: opacity 1ms;
        }

        .animation-test-panel[data-starting-style],
        .animation-test-panel[data-ending-style] {
          opacity: 0;
        }
      `;

      const { user } = render(() => (
        <div>
          <style>{style}</style>
          <Collapsible.Root>
            <Collapsible.Trigger>Toggle</Collapsible.Trigger>
            <Collapsible.Panel
              class="animation-test-panel"
              data-testid="panel"
              onTransitionEnd={notifyTransitionFinished}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </div>
      ));

      expect(screen.queryByTestId('panel')).to.equal(null);

      await user.click(screen.getByRole('button', { name: 'Toggle' }));

      await waitFor(() => {
        expect(transitionFinished).to.equal(true);
      });

      expect(screen.getByTestId('panel')).to.have.attribute('data-open');
    });

    it('applies data-ending-style before unmount during a close transition', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const style = `
        .animation-test-panel {
          transition: opacity 100ms;
        }

        .animation-test-panel[data-starting-style],
        .animation-test-panel[data-ending-style] {
          opacity: 0;
        }
      `;

      const { user } = render(() => (
        <div>
          <style>{style}</style>
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Toggle</Collapsible.Trigger>
            <Collapsible.Panel class="animation-test-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </div>
      ));

      expect(screen.getByTestId('panel')).not.to.equal(null);

      await user.click(screen.getByRole('button', { name: 'Toggle' }));

      await waitFor(() => {
        const panel = screen.queryByTestId('panel');
        expect(panel).not.to.equal(null);
        expect(panel).to.have.attribute('data-ending-style');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('panel')).to.equal(null);
      });
    });
  });
});
