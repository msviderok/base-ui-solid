import { createRenderer } from '#test-utils';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { SolidStore as SolidStoreV2 } from './SolidStoreV2';

type TestState = { value: number; label: string };

describe('SolidStore', () => {
  const { render } = createRenderer();

  it('syncs internal state from controlled prop', () => {
    let store!: SolidStoreV2<TestState>;

    function Test(props: { controlled: number | undefined }) {
      store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useControlledProp('value', () => props.controlled);
      return null;
    }

    const [controlled, setControlled] = createSignal(1);
    render(() => <Test controlled={controlled()} />);
    expect(store.state.value).to.equal(1);

    store.update({ label: 'y' });
    // Non-controlled keys still update
    expect(store.state.label).to.equal('y');

    // Changing the controlled prop updates internal state
    setControlled(7);
    expect(store.state.value).to.equal(7);
  });

  it('warns on switching from uncontrolled to controlled', () => {
    function Test(props: { controlled?: number }) {
      const store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useControlledProp('value', () => props.controlled);
      return null;
    }

    const [controlled, setControlled] = createSignal<number>();
    render(() => <Test controlled={controlled()} />);

    expect(() => {
      setControlled(1);
    }).toErrorDev([
      'A component is changing the controlled state of value to be uncontrolled. Elements should not switch from uncontrolled to controlled (or vice versa).',
    ]);
  });

  it('warns on switching from controlled to uncontrolled', () => {
    function Test(props: { controlled?: number }) {
      const store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useControlledProp('value', () => props.controlled);
      return null;
    }

    const [controlled, setControlled] = createSignal<number | undefined>(1);
    render(() => <Test controlled={controlled()} />);

    expect(() => {
      setControlled(undefined);
    }).toErrorDev([
      'A component is changing the uncontrolled state of value to be controlled. Elements should not switch from uncontrolled to controlled (or vice versa).',
    ]);
  });

  it('useProp updates a single key when the passed value changes', () => {
    let store!: SolidStoreV2<TestState>;

    function Test(props: { value: number }) {
      store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useSyncedValue('value', () => props.value);
      return null;
    }

    const [value, setValue] = createSignal(1);
    render(() => <Test value={value()} />);
    expect(store.state.value).to.equal(1);

    setValue(2);
    expect(store.state.value).to.equal(2);
  });

  it('useProps applies multiple keys from a props object', () => {
    let store!: SolidStoreV2<TestState>;

    function Test(props: { props: Partial<TestState> }) {
      store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useSyncedValues(() => props.props);
      return null;
    }

    const [props, setProps] = createSignal({ value: 5, label: 'a' });
    render(() => <Test props={props()} />);
    expect(store.state.value).to.equal(5);
    expect(store.state.label).to.equal('a');

    setProps({ value: 6, label: 'b' });
    expect(store.state.value).to.equal(6);
    expect(store.state.label).to.equal('b');
  });

  it('useSyncedValues depends on entries instead of object identity', () => {
    let store!: SolidStoreV2<TestState>;
    const updateSpy = spy();

    const [internalStore, setInternalStore] = createStore<TestState>({ value: 0, label: '' });
    const setState: typeof setInternalStore = ((...args: any[]) => {
      updateSpy(...args);
      return (setInternalStore as any)(...args);
    }) as typeof setInternalStore;

    function Test(props: { props: Partial<TestState> }) {
      store = SolidStoreV2<TestState>([internalStore, setState]);
      store.useSyncedValues(() => props.props);
      return null;
    }

    const [props, setProps] = createStore({ value: 5, label: 'a' });
    render(() => <Test props={props} />);

    expect(updateSpy.callCount).to.equal(1);

    setProps({ value: 5, label: 'a' });

    expect(updateSpy.callCount).to.equal(1);

    setProps({ value: 6, label: 'a' });

    expect(updateSpy.callCount).to.equal(2);
    expect(store.state.value).to.equal(6);
  });

  it('warns if useSyncedValues keys change between renders', () => {
    function Test(props: { props: Partial<TestState> }) {
      const store = SolidStoreV2<TestState>({ value: 0, label: '' });
      store.useSyncedValues(() => props.props);
      return null;
    }

    const [props, setProps] = createSignal<any>({ value: 1 });
    render(() => <Test props={props()} />);

    expect(() => {
      setProps({ label: 'x' });
    }).toErrorDev([
      'SolidStore.useSyncedValues expects the same prop keys on every render. Keys should be stable.',
    ]);
  });

  it('useSyncedValueWithCleanup synchronizes value and resets on cleanup', () => {
    type CleanupState = { node: HTMLDivElement | undefined };
    let store!: SolidStoreV2<CleanupState>;

    const firstNode = document.createElement('div');
    const secondNode = document.createElement('div');

    function Test(props: { node: HTMLDivElement | undefined }) {
      store = SolidStoreV2<CleanupState>({ node: undefined });

      store.useSyncedValueWithCleanup('node', () => props.node);
      return null;
    }

    const [node, setNode] = createSignal<HTMLDivElement | undefined>(firstNode);
    const { unmount } = render(() => <Test node={node()} />);
    expect(store.state.node).to.equal(firstNode);

    setNode(secondNode);
    expect(store.state.node).to.equal(secondNode);

    unmount();
    expect(store.state.node).to.equal(undefined);
  });

  it('supports nested stores as state values', async () => {
    type ParentState = { count: number };
    type ChildState = {
      count: number;
      parent?: SolidStoreV2<ParentState, Record<string, never>, typeof parentSelectors>;
    };

    const parentSelectors = { count: (state: ParentState) => state.count };
    const childSelectors = {
      count: (state: ChildState) => state.parent?.state.count ?? state.count,
      parent: (state: ChildState) => state.parent,
    };

    const localCountSelector = (state: ChildState) => state.count;

    const parentStore = SolidStoreV2<ParentState, Record<string, never>, typeof parentSelectors>(
      { count: 0 },
      undefined,
      parentSelectors,
    );

    const childStore = SolidStoreV2<ChildState, Record<string, never>, typeof childSelectors>(
      { count: 10 },
      undefined,
      childSelectors,
    );

    const onCountUpdated = (newCount: number, _: number, state: ChildState) => {
      state.parent?.set('count', newCount);
    };

    childStore.observe(localCountSelector, onCountUpdated);

    function Test() {
      const count = childStore.useState('count');
      return <output data-testid="output">{count()}</output>;
    }

    render(() => <Test />);
    const output = screen.getByTestId('output');

    childStore.set('count', 5);
    expect(childStore.state.count).to.equal(5);
    expect(output.textContent).to.equal('5');

    childStore.set('parent', parentStore);
    expect(childStore.state.count).to.equal(5);
    expect(childStore.select('count')).to.equal(0);
    expect(output.textContent).to.equal('0');

    childStore.set('count', 20);
    expect(childStore.state.count).to.equal(20);
    expect(parentStore.state.count).to.equal(20);
    expect(childStore.select('count')).to.equal(20);
    expect(output.textContent).to.equal('20');

    parentStore.set('count', 15);
    expect(parentStore.state.count).to.equal(15);
    expect(childStore.state.count).to.equal(20);
    expect(childStore.select('count')).to.equal(15);
    expect(output.textContent).to.equal('15');
  });

  it('does not invoke function-valued selector results', () => {
    type FunctionState = {
      comparer: (a: string, b: string) => boolean;
    };

    const equalsIgnoreCase = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    const selectors = {
      comparer: (state: FunctionState) => state.comparer,
    };

    const store = SolidStoreV2<FunctionState, Record<string, never>, typeof selectors>(
      { comparer: equalsIgnoreCase },
      undefined,
      selectors,
    );

    expect(store.select('comparer')).to.equal(equalsIgnoreCase);
    expect(store.useState('comparer')()).to.equal(equalsIgnoreCase);
    expect(store.select('comparer')('A', 'a')).to.equal(true);
  });

  describe('observeSelector', () => {
    type CounterState = { count: number; multiplier: number };
    const selectors = {
      count: (state: CounterState) => state.count,
      doubled: (state: CounterState) => state.count * 2,
      multiplied: (state: CounterState) => state.count * state.multiplier,
    };

    it('accepts selector functions', () => {
      const store = SolidStoreV2<CounterState>({ count: 0, multiplier: 1 });
      const calls: Array<{ newValue: boolean; oldValue: boolean }> = [];

      const unsubscribe = store.observe(
        (state) => state.count > 1,
        (newValue, oldValue) => calls.push({ newValue, oldValue }),
      );

      expect(calls).to.have.lengthOf(1);
      expect(calls[0]).to.deep.equal({ newValue: false, oldValue: false });

      store.set('count', 2);
      expect(calls).to.have.lengthOf(2);
      expect(calls[1]).to.deep.equal({ newValue: true, oldValue: false });

      store.set('count', 1);
      expect(calls).to.have.lengthOf(3);
      expect(calls[2]).to.deep.equal({ newValue: false, oldValue: true });

      unsubscribe();

      store.set('count', 3);
      expect(calls).to.have.lengthOf(3);
    });

    it('calls listener immediately with current selector result on subscription', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls: Array<{ newValue: number; oldValue: number }> = [];

      store.observe('doubled', (newValue: number, oldValue: number) => {
        calls.push({ newValue, oldValue });
      });

      expect(calls).to.have.lengthOf(1);
      expect(calls[0]).to.deep.equal({ newValue: 10, oldValue: 10 });
    });

    it('calls listener when selector result changes', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls: Array<{ newValue: number; oldValue: number }> = [];

      store.observe('doubled', (newValue: number, oldValue: number) => {
        calls.push({ newValue, oldValue });
      });

      store.set('count', 10);
      store.set('count', 7);

      expect(calls).to.have.lengthOf(3);
      expect(calls[1]).to.deep.equal({ newValue: 20, oldValue: 10 });
      expect(calls[2]).to.deep.equal({ newValue: 14, oldValue: 20 });
    });

    it('does not call listener when selector result is unchanged', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls: Array<{ newValue: number; oldValue: number }> = [];

      store.observe('doubled', (newValue: number, oldValue: number) => {
        calls.push({ newValue, oldValue });
      });

      store.set('multiplier', 5);

      expect(calls).to.have.lengthOf(1); // Only initial call
    });

    it('calls listener when any dependency of the selector changes', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls: Array<{ newValue: number; oldValue: number }> = [];

      store.observe('multiplied', (newValue: number, oldValue: number) => {
        calls.push({ newValue, oldValue });
      });

      store.set('count', 10);
      store.set('multiplier', 2);

      expect(calls).to.have.lengthOf(3);
      expect(calls[0]).to.deep.equal({ newValue: 15, oldValue: 15 });
      expect(calls[1]).to.deep.equal({ newValue: 30, oldValue: 15 });
      expect(calls[2]).to.deep.equal({ newValue: 20, oldValue: 30 });
    });

    // it('provides the store instance to the listener', () => {
    //   const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
    //     { count: 5, multiplier: 3 },
    //     undefined,
    //     selectors,
    //   );
    //   let receivedStore!: SolidStoreV2<CounterState, Record<string, never>, typeof selectors>;

    //   store.observe('doubled', (_: number, __: number, storeArg) => {
    //     receivedStore = storeArg;
    //   });

    //   expect(receivedStore).to.equal(store);
    // });

    it('returns an unsubscribe function that stops observing', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls: Array<{ newValue: number; oldValue: number }> = [];

      const unsubscribe = store.observe('doubled', (newValue: number, oldValue: number) => {
        calls.push({ newValue, oldValue });
      });

      store.set('count', 10);
      expect(calls).to.have.lengthOf(2);

      unsubscribe();

      store.set('count', 15);
      expect(calls).to.have.lengthOf(2); // No new calls after unsubscribe
    });

    it('supports multiple observers on the same selector', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const calls1: number[] = [];
      const calls2: number[] = [];

      store.observe('doubled', (newValue: number) => {
        calls1.push(newValue);
      });

      store.observe('doubled', (newValue: number) => {
        calls2.push(newValue);
      });

      store.set('count', 10);

      expect(calls1).to.deep.equal([10, 20]);
      expect(calls2).to.deep.equal([10, 20]);
    });

    it('supports observers on different selectors', () => {
      const store = SolidStoreV2<CounterState, Record<string, never>, typeof selectors>(
        { count: 5, multiplier: 3 },
        undefined,
        selectors,
      );
      const doubledCalls: number[] = [];
      const multipliedCalls: number[] = [];

      store.observe('doubled', (newValue: number) => {
        doubledCalls.push(newValue);
      });

      store.observe('multiplied', (newValue: number) => {
        multipliedCalls.push(newValue);
      });

      store.set('count', 10);
      store.set('multiplier', 2);

      expect(doubledCalls).to.deep.equal([10, 20]);
      expect(multipliedCalls).to.deep.equal([15, 30, 20]);
    });
  });
});
