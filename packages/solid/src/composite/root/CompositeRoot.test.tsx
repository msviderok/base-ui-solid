import { createRenderer, flushMicrotasks, isJSDOM } from '#test-utils';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { expect } from 'chai';
import { createSignal, Index } from 'solid-js';
import { DirectionProvider } from '../../direction-provider';
import { useRef } from '../../solid-helpers';
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

  describe('prop: refs', () => {
    it('calls callback refs with the root element', () => {
      let rootEl: HTMLElement | null | undefined;
      render(() => (
        <CompositeRoot
          refs={[
            (el: HTMLElement | null | undefined) => {
              rootEl = el;
            },
          ]}
          data-testid="root"
        >
          <CompositeItem data-testid="1">1</CompositeItem>
        </CompositeRoot>
      ));
      expect(rootEl).to.equal(screen.getByTestId('root'));
    });
    it('calls multiple callback refs with the root element', () => {
      const received: (HTMLElement | null | undefined)[] = [];
      render(() => (
        <CompositeRoot
          refs={[
            (el: HTMLElement | null | undefined) => received.push(el),
            (el: HTMLElement | null | undefined) => received.push(el),
          ]}
          data-testid="root"
        >
          <CompositeItem data-testid="1">1</CompositeItem>
        </CompositeRoot>
      ));
      expect(received).to.have.length(2);
      expect(received[0]).to.equal(screen.getByTestId('root'));
      expect(received[1]).to.equal(screen.getByTestId('root'));
    });
    it('handles mixed ref types (variable, object, useRef, callback, setter-to-both)', () => {
      let ref1: HTMLElement | null | undefined;
      const ref2 = { current: null as HTMLElement | null };
      const ref3 = useRef<HTMLElement | null>(null);
      const [ref4, setRef4] = createSignal<HTMLElement | null | undefined>(undefined);
      const ref51 = useRef<HTMLElement | null>(null);
      let ref52: HTMLElement | null | undefined;
      const setRef5 = (el: HTMLElement | null | undefined) => {
        ref51.current = el ?? null;
        ref52 = el;
      };
      render(() => (
        <CompositeRoot
          refs={[
            (el) => {
              ref1 = el;
            },
            ref2,
            ref3,
            (el) => setRef4(el),
            setRef5,
          ]}
          data-testid="root"
        >
          <CompositeItem data-testid="1">1</CompositeItem>
        </CompositeRoot>
      ));
      const root = screen.getByTestId('root');
      expect(ref1).to.equal(root);
      expect(ref2.current).to.equal(root);
      expect(ref3.current).to.equal(root);
      // eslint-disable-next-line solid/reactivity
      expect(ref4()).to.equal(root);
      expect(ref51.current).to.equal(root);
      expect(ref52).to.equal(root);
    });
    it('plain let ref stays null when passed by value (primitive cannot be reassigned)', () => {
      let ref: HTMLElement | null = null;
      render(() => (
        <CompositeRoot refs={[ref as any]} data-testid="root">
          <CompositeItem data-testid="1">1</CompositeItem>
        </CompositeRoot>
      ));
      expect(ref).to.equal(null);
    });
    it('flattens nested arrays of refs', () => {
      const received: (HTMLElement | null | undefined)[] = [];
      const refObj = { current: null as HTMLElement | null };
      render(() => (
        <CompositeRoot
          refs={[
            [(el) => received.push(el), (el) => received.push(el)],
            refObj,
          ]}
          data-testid="root"
        >
          <CompositeItem data-testid="1">1</CompositeItem>
        </CompositeRoot>
      ));
      const root = screen.getByTestId('root');
      expect(received).to.have.length(2);
      expect(received[0]).to.equal(root);
      expect(received[1]).to.equal(root);
      expect(refObj.current).to.equal(root);
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
