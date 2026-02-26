import { expect } from 'chai';
import { spy } from 'sinon';
import { createMemo, createRoot, createSignal } from 'solid-js';
import { callEventHandler } from '../solid-helpers';
import type { BaseUIEvent } from '../utils/types';
import { mergeProps } from './mergeProps';

describe('mergeProps', () => {
  it('merges event handlers', () => {
    const theirProps = {
      onClick: spy(),
      onKeyDown: spy(),
    };
    const ourProps = {
      onClick: spy(),
      onPaste: spy(),
    };
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
    callEventHandler(mergedProps.onKeyDown as any, new KeyboardEvent('keydown') as any);
    callEventHandler(mergedProps.onPaste as any, new Event('paste') as any);

    expect(theirProps.onClick.calledBefore(ourProps.onClick)).to.equal(true);
    expect(theirProps.onClick.callCount).to.equal(1);
    expect(ourProps.onClick.callCount).to.equal(1);
    expect(theirProps.onKeyDown.callCount).to.equal(1);
    expect(ourProps.onPaste.callCount).to.equal(1);
  });

  it('merges multiple event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
    expect(log).to.deep.equal(['1', '2', '3']);
  });

  it('merges undefined event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick: undefined,
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
    expect(log).to.deep.equal(['1', '3']);
  });

  it('merges styles', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {
      style: { color: 'blue', backgroundColor: 'blue' },
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.style).to.deep.equal({
      color: 'red',
      backgroundColor: 'blue',
    });
  });

  it('merges styles with undefined', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {};

    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.style).to.deep.equal({
      color: 'red',
    });
  });

  it('does not merge styles if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.style).to.equal(undefined);
  });

  it('merges classes with rightmost first', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {
      class: 'internal-class',
    };
    const mergedProps = mergeProps<'div'>(ourProps, theirProps);

    expect(mergedProps.class).to.equal('external-class internal-class');
  });

  it('merges multiple classes', () => {
    const mergedProps = mergeProps<'div'>(
      {
        class: 'class-1',
      },
      {
        class: 'class-2',
      },
      {
        class: 'class-3',
      },
    );

    expect(mergedProps.class).to.equal('class-3 class-2 class-1');
  });

  it('merges classes with undefined', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {};

    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.class).to.equal('external-class');
  });

  it('does not merge classes if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<'button'>(ourProps, theirProps);

    expect(mergedProps.class).to.equal(undefined);
  });

  it('does not prevent internal handler if event.preventBaseUIHandler() is not called', () => {
    let ran = false;

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {},
      },
      {
        onClick() {
          ran = true;
        },
      },
    );

    callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);

    expect(ran).to.equal(true);
  });

  it('prevents internal handler if event.preventBaseUIHandler() is called', () => {
    let ran = false;

    const mergedProps = mergeProps<'button'>(
      {
        onClick: function onClick3() {
          ran = true;
        },
      },
      {
        onClick: function onClick2() {
          ran = true;
        },
      },
      {
        onClick: function onClick1(event) {
          event.preventBaseUIHandler();
        },
      },
    );

    const event = new MouseEvent('click') as any;
    callEventHandler(mergedProps.onClick as any, event);

    expect(ran).to.equal(false);
  });

  it('prevents handlers merged after event.preventBaseUIHandler() is called', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<any>(
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          log.push('1');
        },
      },
      {
        onClick() {
          log.push('0');
        },
      },
    );

    callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);

    expect(log).to.deep.equal(['0', '1']);
  });

  [true, 13, 'newValue', { key: 'value' }, ['value'], () => 'value'].forEach((eventArgument) => {
    it('handles non-standard event handlers without error', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<any>(
        {
          onValueChange() {
            log.push('1');
          },
        },
        {
          onValueChange() {
            log.push('0');
          },
        },
      );

      mergedProps.onValueChange(eventArgument);

      expect(log).to.deep.equal(['0', '1']);
    });
  });

  it('merges internal props so that the ones defined first override the ones defined later', () => {
    const mergedProps = mergeProps<'button'>(
      {
        title: 'internal title 2',
      },
      {
        title: 'internal title 1',
      },
      {},
    );

    expect(mergedProps.title).to.equal('internal title 1');
  });

  it('sets baseUIHandlerPrevented to true after calling preventBaseUIHandler()', () => {
    let observedFlag: boolean | undefined;

    const mergedProps = mergeProps<'button'>(
      {
        onClick() {},
      },
      {
        onClick(event) {
          event.preventBaseUIHandler();
          observedFlag = event.baseUIHandlerPrevented;
        },
      },
    );

    callEventHandler(mergedProps.onClick, new MouseEvent('click') as any);

    expect(observedFlag).to.equal(true);
  });

  describe('callAllHandlers option', () => {
    it('executes all event handlers when callAllHandlers is true', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('1');
          },
        },
        {
          onClick() {
            log.push('2');
          },
        },
        {
          onClick() {
            log.push('3');
          },
        },
        { callAllHandlers: true },
      );

      callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
      expect(log).to.deep.equal(['1', '2', '3']);
    });

    it('returns the first non-undefined result from handlers', () => {
      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            return undefined;
          },
        },
        {
          onClick() {
            return 'second';
          },
        },
        {
          onClick() {
            return 'third';
          },
        },
        { callAllHandlers: true },
      );

      const result = (mergedProps.onClick as any)(new MouseEvent('click'));
      expect(result).to.equal('second');
    });

    it('does not use preventable chaining when callAllHandlers is true', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('1');
          },
        },
        {
          onClick() {
            log.push('2');
          },
        },
        {
          onClick() {
            log.push('3');
          },
        },
        { callAllHandlers: true },
      );

      callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
      // All handlers run in source order (not reverse like preventable chaining)
      expect(log).to.deep.equal(['1', '2', '3']);
    });

    it('works with array syntax', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        [
          {
            onClick() {
              log.push('1');
            },
          },
          {
            onClick() {
              log.push('2');
            },
          },
        ],
        { callAllHandlers: true },
      );

      callEventHandler(mergedProps.onClick as any, new MouseEvent('click') as any);
      expect(log).to.deep.equal(['1', '2']);
    });

    it('still merges non-event props normally', () => {
      const mergedProps = mergeProps<'button'>(
        { title: 'first' },
        { title: 'second', role: 'button' },
        { callAllHandlers: true },
      );

      expect(mergedProps.title).to.equal('second');
      expect(mergedProps.role).to.equal('button');
    });
  });

  describe('props getters', () => {
    it('calls the props getter with the props defined after it', () => {
      let observedProps;
      const propsGetter = spy((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(
        {
          id: '2',
          className: 'test-class',
        },
        propsGetter,
        {
          id: '1',
          role: 'button',
        },
      );

      expect(propsGetter.calledOnce).to.equal(true);
      expect(observedProps).to.deep.equal({ id: '2', className: 'test-class' });
    });

    it('calls the props getter with merged props defined after it', () => {
      let observedProps;
      const propsGetter = spy((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(
        {
          role: 'button',
          className: 'test-class',
        },
        {
          role: 'tab',
        },
        propsGetter,
        {
          id: 'one',
        },
      );

      expect(propsGetter.calledOnce).to.equal(true);
      expect(observedProps).to.deep.equal({
        role: 'tab',
        className: 'test-class',
      });
    });

    it('calls the props getter with an empty object if no props are defined after it', () => {
      let observedProps;
      const propsGetter = spy((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps(propsGetter, { id: '1' });

      expect(propsGetter.calledOnce).to.equal(true);
      expect(observedProps).to.deep.equal({});
    });

    it('accepts the result of the props getter', () => {
      const propsGetter = () => ({ class: 'test-class' });
      const result = mergeProps(
        {
          id: 'two',
          role: 'tab',
        },
        {
          id: 'one',
        },
        propsGetter,
      );

      expect(result).to.deep.equal({
        class: 'test-class',
      });
    });

    it('properly merges native object getters in a reactive way (class/style/ref/classList + other dynamic props)', () => {
      createRoot((dispose) => {
        const [isOn, setIsOn] = createSignal(false);
        const [color, setColor] = createSignal<'blue' | 'red'>('blue');
        const [isEnabled, setIsEnabled] = createSignal(false);
        const [count, setCount] = createSignal(0);
        const [mode, setMode] = createSignal<'a' | 'b'>('a');

        let classGetterCalls = 0;
        let styleGetterCalls = 0;
        let classListGetterCalls = 0;
        let titleGetterCalls = 0;
        let tabIndexGetterCalls = 0;

        const refA = spy();
        const refB = spy();

        const mergedProps = mergeProps<'div'>(
          {
            get class() {
              classGetterCalls += 1;
              return isOn() ? 'on' : 'off';
            },
            get style() {
              styleGetterCalls += 1;
              return { color: color() };
            },
            get classList() {
              classListGetterCalls += 1;
              return { enabled: isEnabled() };
            },
            get title() {
              titleGetterCalls += 1;
              return `title-${count()}`;
            },
            get tabIndex() {
              tabIndexGetterCalls += 1;
              return mode() === 'a' ? 0 : -1;
            },
          },
          {
            class: 'static-class',
            style: { padding: '1px' },
            classList: { staticKey: true },
            ref: refA,
            id: 'static-id',
          },
          { ref: refB },
        );

        // Getters should be evaluated lazily, not during mergeProps() call.
        expect(classGetterCalls).to.equal(0);
        expect(styleGetterCalls).to.equal(0);
        expect(classListGetterCalls).to.equal(0);
        expect(titleGetterCalls).to.equal(0);
        expect(tabIndexGetterCalls).to.equal(0);

        const classValue = createMemo(() => mergedProps.class);
        const styleValue = createMemo(() => mergedProps.style);
        const classListValue = createMemo(() => mergedProps.classList);
        const titleValue = createMemo(() => mergedProps.title);
        const tabIndexValue = createMemo(() => mergedProps.tabIndex);
        const staticValue = createMemo(() => mergedProps.id);

        expect(classValue()).to.equal('static-class off');
        expect(styleValue()).to.deep.equal({ color: 'blue', padding: '1px' });
        expect(classListValue()).to.deep.equal({ enabled: false, staticKey: true });
        expect(titleValue()).to.equal('title-0');
        expect(tabIndexValue()).to.equal(0);
        expect(staticValue()).to.equal('static-id');

        expect(classGetterCalls).to.equal(1);
        expect(styleGetterCalls).to.equal(1);
        expect(classListGetterCalls).to.equal(1);

        const titleCallsBefore = titleGetterCalls;
        const tabIndexCallsBefore = tabIndexGetterCalls;

        const element = document.createElement('div');
        (mergedProps.ref as any)?.(element);
        expect(refB.calledBefore(refA)).to.equal(true);
        expect(refA.calledWith(element)).to.equal(true);
        expect(refB.calledWith(element)).to.equal(true);

        setIsOn(true);
        setColor('red');
        setIsEnabled(true);
        setCount(1);
        setMode('b');

        expect(classValue()).to.equal('static-class on');
        expect(styleValue()).to.deep.equal({ color: 'red', padding: '1px' });
        expect(classListValue()).to.deep.equal({ enabled: true, staticKey: true });
        expect(titleValue()).to.equal('title-1');
        expect(tabIndexValue()).to.equal(-1);
        expect(staticValue()).to.equal('static-id');

        expect(classGetterCalls).to.equal(2);
        expect(styleGetterCalls).to.equal(2);
        expect(classListGetterCalls).to.equal(2);
        expect(titleGetterCalls).to.be.greaterThan(titleCallsBefore);
        expect(tabIndexGetterCalls).to.be.greaterThan(tabIndexCallsBefore);

        dispose();
      });
    });

    it('does not automatically prevent handlers that are manually called by getter handlers', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            // Call preventBaseUIHandler to signal prevention
            event.preventBaseUIHandler();
            log.push('getter-handler');
            // Manually calling the previous handler - this bypasses automatic prevention!
            callEventHandler(props.onClick, new MouseEvent('click') as any);
          },
        }),
        {
          onClick() {
            // This handler does NOT call preventBaseUIHandler, so getter-handler runs
            log.push('last-handler');
          },
        },
      );

      callEventHandler(mergedProps.onClick, new MouseEvent('click') as any);

      // last-handler runs first, then getter-handler (not prevented), then getter-handler
      // manually calls first-handler which runs despite preventBaseUIHandler being called
      expect(log).to.deep.equal(['last-handler', 'getter-handler', 'first-handler']);
    });

    it('allows props getter handlers to check baseUIHandlerPrevented manually', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<'button'>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            // Call preventBaseUIHandler to signal prevention
            event.preventBaseUIHandler();
            log.push('getter-handler');
            // Check the flag before manually calling previous handlers - this respects prevention
            if (!event.baseUIHandlerPrevented) {
              callEventHandler(props.onClick, new MouseEvent('click') as any);
            }
          },
        }),
        {
          onClick() {
            // This handler does NOT call preventBaseUIHandler, so getter-handler runs
            log.push('last-handler');
          },
        },
      );

      callEventHandler(mergedProps.onClick, new MouseEvent('click') as any);

      // first-handler does NOT run because getter-handler checks the flag before calling it
      expect(log).to.deep.equal(['last-handler', 'getter-handler']);
    });
  });
});
