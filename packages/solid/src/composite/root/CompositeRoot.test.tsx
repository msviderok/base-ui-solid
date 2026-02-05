import { createRenderer, flushMicrotasks, isJSDOM } from '#test-utils';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal, Index } from 'solid-js';
import { DirectionProvider } from '../../direction-provider';
import { CompositeItem } from '../item/CompositeItem';
import { CompositeRoot } from './CompositeRoot';

describe('Composite', () => {
  const { render } = createRenderer();

  describe('list', () => {
    it('controlled mode', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = createSignal(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex()}
            onHighlightedIndexChange={setHighlightedIndex}
          >
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>
        );
      }

      render(() => <App />);

      const item1 = screen.getByTestId('1');
      const item2 = screen.getByTestId('2');
      const item3 = screen.getByTestId('3');

      item1.focus();

      expect(screen.getByTestId('1')).to.have.attribute('tabindex', '0');

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowDown' });
      await flushMicrotasks();

      expect(item3).to.have.attribute('tabindex', '0');
      expect(item3).toHaveFocus();

      fireEvent.keyDown(item3, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item2).to.have.attribute('tabindex', '0');
      expect(item2).toHaveFocus();

      fireEvent.keyDown(item2, { key: 'ArrowUp' });
      await flushMicrotasks();

      expect(item1).to.have.attribute('tabindex', '0');
      expect(item1).toHaveFocus();
    });

    it('uncontrolled mode', async () => {
      render(() => (
        <CompositeRoot>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
          <CompositeItem data-testid="3">3</CompositeItem>
        </CompositeRoot>
      ));

      const item1 = screen.getByTestId('1');
      const item2 = screen.getByTestId('2');
      const item3 = screen.getByTestId('3');

      item1.focus();

      fireEvent.keyDown(item1, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();
      });

      fireEvent.keyDown(item2, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });

      fireEvent.keyDown(item3, { key: 'ArrowUp' });

      await waitFor(() => {
        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();
      });

      fireEvent.keyDown(item2, { key: 'ArrowUp' });

      await waitFor(() => {
        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();
      });
    });

    it.skipIf(isJSDOM)('updates the order of items', async () => {
      function App(props: { items: string[] }) {
        return (
          <CompositeRoot>
            <Index each={props.items}>
              {(item) => <CompositeItem data-testid={item()}>{item()}</CompositeItem>}
            </Index>
          </CompositeRoot>
        );
      }

      const [items, setItems] = createSignal(['1', '2', '3']);

      const { user } = render(() => <App items={items()} />);
      setItems(['1', '3', '2']);

      const item1 = screen.getByTestId('1');
      const item3 = screen.getByTestId('3');

      item1.focus();
      await user.keyboard('{ArrowDown}');
      expect(item3).toHaveFocus();
    });

    describe('Home and End keys', () => {
      it('Home key moves focus to the first item', async () => {
        render(() => (
          <CompositeRoot enableHomeAndEndKeys>
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>
        ));

        const item1 = screen.getByTestId('1');
        const item3 = screen.getByTestId('3');

        item3.focus();

        fireEvent.keyDown(item3, { key: 'Home' });

        await waitFor(() => {
          expect(item1).to.have.attribute('tabindex', '0');
          expect(item1).toHaveFocus();
        });
      });

      it('End key moves focus to the last item', async () => {
        render(() => (
          <CompositeRoot enableHomeAndEndKeys>
            <CompositeItem data-testid="1">1</CompositeItem>
            <CompositeItem data-testid="2">2</CompositeItem>
            <CompositeItem data-testid="3">3</CompositeItem>
          </CompositeRoot>
        ));

        const item1 = screen.getByTestId('1');
        const item3 = screen.getByTestId('3');

        item1.focus();

        fireEvent.keyDown(item1, { key: 'End' });

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });
      });
    });

    describe.skipIf(isJSDOM)('rtl', () => {
      it('horizontal orientation', async () => {
        render(() => (
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot orientation="horizontal">
                <CompositeItem data-testid="1">1</CompositeItem>
                <CompositeItem data-testid="2">2</CompositeItem>
                <CompositeItem data-testid="3">3</CompositeItem>
              </CompositeRoot>
            </DirectionProvider>
          </div>
        ));

        const item1 = screen.getByTestId('1');
        const item2 = screen.getByTestId('2');
        const item3 = screen.getByTestId('3');

        item1.focus();

        fireEvent.keyDown(item1, { key: 'ArrowDown' });

        fireEvent.keyDown(item1, { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });

        fireEvent.keyDown(item3, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(item1).to.have.attribute('tabindex', '0');
          expect(item1).toHaveFocus();
        });

        // loop backward
        fireEvent.keyDown(item1, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });
      });

      it('both horizontal and vertical orientation', async () => {
        render(() => (
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot orientation="both">
                <CompositeItem data-testid="1">1</CompositeItem>
                <CompositeItem data-testid="2">2</CompositeItem>
                <CompositeItem data-testid="3">3</CompositeItem>
              </CompositeRoot>
            </DirectionProvider>
          </div>
        ));

        const item1 = screen.getByTestId('1');
        const item2 = screen.getByTestId('2');
        const item3 = screen.getByTestId('3');

        item1.focus();

        fireEvent.keyDown(item1, { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });

        fireEvent.keyDown(item3, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowRight' });

        await waitFor(() => {
          expect(item1).to.have.attribute('tabindex', '0');
          expect(item1).toHaveFocus();
        });

        fireEvent.keyDown(item1, { key: 'ArrowDown' });

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowDown' });

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });
      });
    });
  });

  describe('grid', () => {
    it('uniform 1x1 items', async () => {
      function App() {
        return (
          // 1 to 9 numpad
          <CompositeRoot cols={3} enableHomeAndEndKeys>
            <Index each={['1', '2', '3', '4', '5', '6', '7', '8', '9']}>
              {(i) => <CompositeItem data-testid={i()}>{i()}</CompositeItem>}
            </Index>
          </CompositeRoot>
        );
      }

      render(() => <App />);

      screen.getByTestId('1').focus();

      fireEvent.keyDown(screen.getByTestId('1'), { key: 'ArrowDown' });

      await waitFor(() => {
        expect(screen.getByTestId('4')).to.have.attribute('tabindex', '0');
        expect(screen.getByTestId('4')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByTestId('4'), { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByTestId('5')).to.have.attribute('tabindex', '0');
        expect(screen.getByTestId('5')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByTestId('5'), { key: 'ArrowDown' });

      await waitFor(() => {
        expect(screen.getByTestId('8')).to.have.attribute('tabindex', '0');
        expect(screen.getByTestId('8')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByTestId('8'), { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByTestId('7')).to.have.attribute('tabindex', '0');
        expect(screen.getByTestId('7')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByTestId('7'), { key: 'ArrowUp' });

      await waitFor(() => {
        expect(screen.getByTestId('4')).to.have.attribute('tabindex', '0');
        expect(screen.getByTestId('4')).toHaveFocus();
      });

      screen.getByTestId('9').focus();

      await waitFor(() => {
        expect(screen.getByTestId('9')).to.have.attribute('tabindex', '0');
      });

      fireEvent.keyDown(screen.getByTestId('9'), { key: 'Home' });

      await waitFor(() => {
        expect(screen.getByTestId('1')).to.have.attribute('tabindex', '0');
      });

      fireEvent.keyDown(screen.getByTestId('1'), { key: 'End' });

      await waitFor(() => {
        expect(screen.getByTestId('9')).to.have.attribute('tabindex', '0');
      });
    });

    describe.skipIf(isJSDOM)('rtl', () => {
      it('horizontal orientation', async () => {
        render(() => (
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot cols={3} orientation="horizontal" enableHomeAndEndKeys>
                <Index each={['1', '2', '3', '4', '5', '6', '7', '8', '9']}>
                  {(i) => <CompositeItem data-testid={i()}>{i()}</CompositeItem>}
                </Index>
              </CompositeRoot>
            </DirectionProvider>
          </div>
        ));

        screen.getByTestId('1').focus();

        fireEvent.keyDown(screen.getByTestId('1'), { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByTestId('2')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('2')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('2'), { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByTestId('3')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('3')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('3'), { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByTestId('4')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('4')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('4'), { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByTestId('5')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('5')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('5'), { key: 'Home' });

        await waitFor(() => {
          expect(screen.getByTestId('1')).to.have.attribute('tabindex', '0');
        });

        fireEvent.keyDown(screen.getByTestId('1'), { key: 'End' });

        await waitFor(() => {
          expect(screen.getByTestId('9')).to.have.attribute('tabindex', '0');
        });
      });

      it('both horizontal and vertical orientation', async () => {
        render(() => (
          <div dir="rtl">
            <DirectionProvider direction="rtl">
              <CompositeRoot cols={3} orientation="both" enableHomeAndEndKeys>
                <Index each={['1', '2', '3', '4', '5', '6', '7', '8', '9']}>
                  {(i) => <CompositeItem data-testid={i()}>{i()}</CompositeItem>}
                </Index>
              </CompositeRoot>
            </DirectionProvider>
          </div>
        ));

        screen.getByTestId('1').focus();

        fireEvent.keyDown(screen.getByTestId('1'), { key: 'ArrowDown' });

        await waitFor(() => {
          expect(screen.getByTestId('4')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('4')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('4'), { key: 'ArrowLeft' });

        await waitFor(() => {
          expect(screen.getByTestId('5')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('5')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('5'), { key: 'ArrowDown' });

        await waitFor(() => {
          expect(screen.getByTestId('8')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('8')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('8'), { key: 'ArrowRight' });

        await waitFor(() => {
          expect(screen.getByTestId('7')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('7')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('7'), { key: 'ArrowUp' });

        await waitFor(() => {
          expect(screen.getByTestId('4')).to.have.attribute('tabindex', '0');
          expect(screen.getByTestId('4')).toHaveFocus();
        });

        fireEvent.keyDown(screen.getByTestId('4'), { key: 'End' });

        await waitFor(() => {
          expect(screen.getByTestId('9')).to.have.attribute('tabindex', '0');
        });

        fireEvent.keyDown(screen.getByTestId('9'), { key: 'Home' });

        await waitFor(() => {
          expect(screen.getByTestId('1')).to.have.attribute('tabindex', '0');
        });
      });
    });

    describe('prop: disabledIndices', () => {
      it('disables navigating item when their index is included', async () => {
        function App() {
          const [highlightedIndex, setHighlightedIndex] = createSignal(0);
          return (
            <CompositeRoot
              highlightedIndex={highlightedIndex()}
              onHighlightedIndexChange={setHighlightedIndex}
              disabledIndices={[1]}
            >
              <CompositeItem data-testid="1" />
              <CompositeItem data-testid="2" />
              <CompositeItem data-testid="3" />
            </CompositeRoot>
          );
        }

        render(() => <App />);

        const item1 = screen.getByTestId('1');
        const item3 = screen.getByTestId('3');

        item1.focus();

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });

        fireEvent.keyDown(item3, { key: 'ArrowUp' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item1).to.have.attribute('tabindex', '0');
          expect(item1).toHaveFocus();
        });
      });

      it('allows navigating items disabled in the DOM when their index is excluded', async () => {
        function App() {
          const [highlightedIndex, setHighlightedIndex] = createSignal(0);
          return (
            <CompositeRoot
              highlightedIndex={highlightedIndex()}
              onHighlightedIndexChange={setHighlightedIndex}
              disabledIndices={[]}
            >
              <CompositeItem
                data-testid="1"
                // TS doesn't like the disabled attribute on non-interactive elements
                // but testing library refuses to focus disabled interactive elements
                render={{
                  component: 'span',
                  'data-disabled': true,
                  'aria-disabled': true,
                  disabled: true,
                }}
              />
              <CompositeItem
                data-testid="2"
                render={{
                  component: 'span',
                  'data-disabled': true,
                  'aria-disabled': true,
                  disabled: true,
                }}
              />
              <CompositeItem
                data-testid="3"
                render={{
                  component: 'span',
                  'data-disabled': true,
                  'aria-disabled': true,
                  disabled: true,
                }}
              />
            </CompositeRoot>
          );
        }

        render(() => <App />);

        const item1 = screen.getByTestId('1');
        const item2 = screen.getByTestId('2');
        const item3 = screen.getByTestId('3');

        item1.focus();

        await waitFor(() => {
          expect(item1).toHaveFocus();
        });

        fireEvent.keyDown(item1, { key: 'ArrowDown' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item2).to.have.attribute('tabindex', '0');
          expect(item2).toHaveFocus();
        });

        fireEvent.keyDown(item2, { key: 'ArrowDown' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });

        fireEvent.keyDown(item3, { key: 'ArrowDown' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item1).to.have.attribute('tabindex', '0');
          expect(item1).toHaveFocus();
        });

        fireEvent.keyDown(item1, { key: 'ArrowUp' });
        await flushMicrotasks();

        await waitFor(() => {
          expect(item3).to.have.attribute('tabindex', '0');
          expect(item3).toHaveFocus();
        });
      });
    });
  });

  describe('prop: disabledIndices', () => {
    it('disables navigating item when their index is included', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = createSignal(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex()}
            onHighlightedIndexChange={setHighlightedIndex}
            disabledIndices={[1]}
          >
            <CompositeItem data-testid="1" />
            <CompositeItem data-testid="2" />
            <CompositeItem data-testid="3" />
          </CompositeRoot>
        );
      }

      render(() => <App />);

      const item1 = screen.getByTestId('1');
      const item3 = screen.getByTestId('3');

      item1.focus();

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });

      fireEvent.keyDown(item3, { key: 'ArrowUp' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();
      });
    });

    it('allows navigating items disabled in the DOM when their index is excluded', async () => {
      function App() {
        const [highlightedIndex, setHighlightedIndex] = createSignal(0);
        return (
          <CompositeRoot
            highlightedIndex={highlightedIndex()}
            onHighlightedIndexChange={setHighlightedIndex}
            disabledIndices={[]}
          >
            <CompositeItem
              data-testid="1"
              render={{
                component: 'span',
                'data-disabled': true,
                'aria-disabled': true,
                disabled: true,
              }}
            />
            <CompositeItem
              data-testid="2"
              render={{
                component: 'span',
                'data-disabled': true,
                'aria-disabled': true,
                disabled: true,
              }}
            />
            <CompositeItem
              data-testid="3"
              render={{
                component: 'span',
                'data-disabled': true,
                'aria-disabled': true,
                disabled: true,
              }}
            />
          </CompositeRoot>
        );
      }

      render(() => <App />);

      const item1 = screen.getByTestId('1');
      const item2 = screen.getByTestId('2');
      const item3 = screen.getByTestId('3');

      item1.focus();

      fireEvent.keyDown(item1, { key: 'ArrowDown' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item2).to.have.attribute('tabindex', '0');
        expect(item2).toHaveFocus();
      });

      fireEvent.keyDown(item2, { key: 'ArrowDown' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });

      fireEvent.keyDown(item3, { key: 'ArrowDown' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item1).to.have.attribute('tabindex', '0');
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowUp' });
      await flushMicrotasks();

      await waitFor(() => {
        expect(item3).to.have.attribute('tabindex', '0');
        expect(item3).toHaveFocus();
      });
    });
  });

  describe('prop: modifierKeys', () => {
    it('prevents arrow key navigation when any modifier key is pressed by default', async () => {
      render(() => (
        <CompositeRoot>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
        </CompositeRoot>
      ));

      const item1 = screen.getByTestId('1');

      item1.focus();

      expect(item1).toHaveFocus();

      fireEvent.keyDown(item1, { key: 'ArrowDown', shiftKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowDown', ctrlKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowDown', altKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowDown', metaKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });
    });

    it('specifies allowed modifier keys that do not prevent arrow key navigation when pressed', async () => {
      render(() => (
        <CompositeRoot modifierKeys={['Alt', 'Meta']}>
          <CompositeItem data-testid="1">1</CompositeItem>
          <CompositeItem data-testid="2">2</CompositeItem>
          <CompositeItem data-testid="3">3</CompositeItem>
        </CompositeRoot>
      ));

      const item1 = screen.getByTestId('1');
      const item2 = screen.getByTestId('2');
      const item3 = screen.getByTestId('3');

      item1.focus();

      expect(item1).toHaveFocus();

      fireEvent.keyDown(screen.getByTestId('1'), { key: 'ArrowDown', shiftKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowDown', ctrlKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item1).toHaveFocus();
      });

      fireEvent.keyDown(item1, { key: 'ArrowDown', altKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item2).toHaveFocus();
      });

      fireEvent.keyDown(item2, { key: 'ArrowDown', metaKey: true });
      await flushMicrotasks();
      await waitFor(() => {
        expect(item3).toHaveFocus();
      });
    });
  });
});
