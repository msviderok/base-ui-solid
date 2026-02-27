import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal, Index, Show, type JSX } from 'solid-js';
import { defaultProps } from '../../solid-helpers';
import { vi } from 'vitest';
import { Main } from '../../../test/floating-ui-tests/Menu';
import { useClick, useFloating, useInteractions, useTypeahead } from '../index';
import type { UseTypeaheadProps } from './useTypeahead';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

const useImpl = (
  componentProps: Pick<UseTypeaheadProps, 'onMatch' | 'onTypingChange'> & {
    list?: Array<string>;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    addUseClick?: boolean;
  },
) => {
  const props = defaultProps(componentProps, { addUseClick: false });
  const [open, setOpen] = createSignal(true);
  const [activeIndex, setActiveIndex] = createSignal<null | number>(null);
  const { refs, context } = useFloating({
    get open() {
      return props.open ?? open();
    },
    get onOpenChange() {
      return props.onOpenChange ?? setOpen;
    },
  });
  const typeahead = useTypeahead({
    context,
    props: {
      get listRef() {
        return props.list ?? ['one', 'two', 'three'];
      },
      get activeIndex() {
        return activeIndex();
      },
      onMatch(index) {
        setActiveIndex(index);
        props.onMatch?.(index);
      },
      get onTypingChange() {
        return props.onTypingChange;
      },
    },
  });
  const click = useClick({
    context,
    props: {
      get enabled() {
        return props.addUseClick;
      },
    },
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([typeahead, click]);

  return {
    activeIndex,
    open,
    getReferenceProps: (userProps?: JSX.HTMLAttributes<Element>) =>
      getReferenceProps({
        role: 'combobox',
        ...userProps,
        ref: refs.setReference,
      }),
    getFloatingProps: () =>
      getFloatingProps({
        role: 'listbox',
        ref: refs.setFloating,
      }),
  };
};

function Combobox(
  props: Pick<UseTypeaheadProps, 'onMatch' | 'onTypingChange'> & {
    list?: Array<string>;
  },
) {
  const { getReferenceProps, getFloatingProps } = useImpl(props);
  return (
    <>
      <input {...getReferenceProps()} />
      <div {...getFloatingProps()} />
    </>
  );
}

describe('useTypeahead', () => {
  it('rapidly focuses list items when they start with the same letter', async () => {
    const spy = vi.fn();
    render(() => <Combobox onMatch={spy} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(2);

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('bails out of rapid focus of first letter if the list contains a string that starts with two of the same letter', async () => {
    const spy = vi.fn();
    render(() => <Combobox onMatch={spy} list={['apple', 'aaron', 'apricot']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(0);

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('starts from the current activeIndex and correctly loops', async () => {
    const spy = vi.fn();
    render(() => <Combobox onMatch={spy} list={['Toy Story 2', 'Toy Story 3', 'Toy Story 4']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    await userEvent.keyboard('o');
    await userEvent.keyboard('y');
    expect(spy).toHaveBeenCalledWith(0);

    spy.mockReset();

    await userEvent.keyboard('t');
    await userEvent.keyboard('o');
    await userEvent.keyboard('y');
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(750);

    await userEvent.keyboard('t');
    await userEvent.keyboard('o');
    await userEvent.keyboard('y');
    expect(spy).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(750);

    await userEvent.keyboard('t');
    await userEvent.keyboard('o');
    await userEvent.keyboard('y');
    expect(spy).toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(750);

    await userEvent.keyboard('t');
    await userEvent.keyboard('o');
    await userEvent.keyboard('y');
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('capslock characters continue to match', async () => {
    const spy = vi.fn();
    render(() => <Combobox onMatch={spy} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('{CapsLock}t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  function App1(props: Pick<UseTypeaheadProps, 'onMatch'> & { list: Array<string> }) {
    const { getReferenceProps, getFloatingProps, activeIndex, open } = useImpl(props);
    let inputRef: HTMLInputElement | undefined;

    return (
      <>
        <div
          {...getReferenceProps({
            onClick: () => inputRef?.focus(),
          })}
        >
          <input ref={inputRef} readOnly />
        </div>
        <Show when={open()}>
          <div {...getFloatingProps()}>
            <Index each={props.list}>
              {(value, i) => (
                <div
                  role="option"
                  tabIndex={i === activeIndex() ? 0 : -1}
                  aria-selected={i === activeIndex()}
                >
                  {value()}
                </div>
              )}
            </Index>
          </div>
        </Show>
      </>
    );
  }

  it('matches when focus is within reference', async () => {
    const spy = vi.fn();
    render(() => <App1 onMatch={spy} list={['one', 'two', 'three']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('matches when focus is within floating', async () => {
    const spy = vi.fn();
    render(() => <App1 onMatch={spy} list={['one', 'two', 'three']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    const option = await screen.findByRole('option', { selected: true });
    expect(option.textContent).toBe('two');
    option.focus();
    expect(option).toHaveFocus();

    await userEvent.keyboard('h');
    expect((await screen.findByRole('option', { selected: true })).textContent).toBe('three');
  });

  it('onTypingChange is called when typing starts or stops', async () => {
    const spy = vi.fn();
    render(() => <Combobox onTypingChange={spy} list={['one', 'two', 'three']} />);

    screen.getByRole('combobox').focus();

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(750);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('Menu - skips disabled items and opens submenu on space if no match', async () => {
    vi.useRealTimers();

    render(() => <Main />);

    await userEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    await userEvent.keyboard('c');

    await waitFor(() => {
      expect(screen.getByText('Copy as')).toHaveFocus();
    });

    await userEvent.keyboard('opy as ');

    await waitFor(() => {
      expect(screen.getByText('Copy as').getAttribute('aria-expanded')).toBe('false');
    });

    await userEvent.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByText('Copy as').getAttribute('aria-expanded')).toBe('true');
    });
  });
});
