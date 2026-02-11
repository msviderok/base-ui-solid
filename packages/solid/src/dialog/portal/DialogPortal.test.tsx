import { createRenderer, describeConformance } from '#test-utils';
import { Dialog } from '@msviderok/base-ui-solid/dialog';
import { screen } from '@solidjs/testing-library';
import { lazy, Suspense, type Component } from 'solid-js';
import { expect } from 'vitest';

describe('<Dialog.Portal />', () => {
  const { render } = createRenderer();

  describeConformance(Dialog.Portal, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node, props) {
      return render(() => <Dialog.Root open>{node(props!)}</Dialog.Root>);
    },
  }));

  describe('Suspense integration', () => {
    // Issue #3695
    it('should not throw "Maximum update depth exceeded" when Suspense boundary is outside Portal', async () => {
      function createLazyComponent() {
        let resolvePromise: ((value: { default: Component }) => void) | null = null;
        const promise = new Promise<{ default: Component }>((resolve) => {
          resolvePromise = resolve;
        });

        return {
          LazyComponent: lazy(() => promise),
          resolve(value: { default: Component }) {
            if (!resolvePromise) {
              throw new Error('Lazy message resolver not initialized.');
            }
            resolvePromise(value);
          },
        };
      }

      const { LazyComponent, resolve } = createLazyComponent();

      render(() => (
        <Suspense fallback="Loading...">
          <Dialog.Root open>
            <Dialog.Portal>
              <Dialog.Popup>
                <LazyComponent />
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </Suspense>
      ));

      expect(await screen.findByText('Loading...')).not.to.equal(null);
      resolve({ default: () => <p>Greetings</p> });
      expect(await screen.findByText('Greetings')).not.to.equal(null);
    });
  });
});
