/* eslint-disable testing-library/render-result-naming-convention */
import { createRenderer, flushMicrotasks } from '#test-utils';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import {
  createSignal,
  lazy,
  onCleanup,
  onMount,
  Show,
  splitProps,
  Suspense,
  type ComponentProps,
  type JSX,
} from 'solid-js';
import { mergeProps as solidMergeProps } from '../merge-props';
import type { BaseUIComponentProps } from '../utils/types';
import { useRenderElement } from './useRenderElement';

describe('useRenderElement', () => {
  const { render } = createRenderer();

  function TestComponent(
    componentProps: BaseUIComponentProps<'div', { active?: boolean }> & { active?: boolean },
  ) {
    const [local, elementProps] = splitProps(componentProps, ['class', 'render', 'active']);

    const element = useRenderElement('div', componentProps, {
      state: {
        get active() {
          return local.active;
        },
      },
      props: [elementProps, { class: 'test-component', style: { padding: '10px' } }],
    });

    return <>{element()}</>;
  }

  it('accepts class as function', () => {
    const { container } = render(() => (
      <TestComponent active class={(state) => (state.active ? 'active-class' : 'inactive-class')} />
    ));

    const element = container.firstElementChild;

    expect(element).to.have.attribute('class', 'active-class test-component');
  });

  it('accepts class as function that returns undefined', () => {
    const { container } = render(() => (
      <TestComponent class={(state) => (state.active ? 'active-class' : undefined)} />
    ));

    const element = container.firstElementChild;

    expect(element).to.have.attribute('class', 'test-component');
  });

  it('accepts style as function', () => {
    const { container } = render(() => (
      <TestComponent
        active
        style={(state) => ({ color: state.active ? 'rgb(255,0,0)' : 'rgb(0,255,0)' })}
      />
    ));

    const element = container.firstElementChild;

    expect(element?.getAttribute('style')).to.equal('padding: 10px; color: rgb(255, 0, 0);');
  });

  it('accepts style as function that returns undefined', () => {
    const { container } = render(() => (
      <TestComponent style={(state) => (state.active ? { color: 'rgb(255,0,0)' } : undefined)} />
    ));

    const element = container.firstElementChild;

    expect(element?.getAttribute('style')).to.equal('padding: 10px;');
  });

  describe('render prop', () => {
    it('accepts render as a function that receives props and state', async () => {
      const renderFn = vi.fn((props, state) => {
        return <span {...props} data-active={String(state.active)} />;
      });

      const { container } = render(() => (
        <TestComponent active render={renderFn} data-testid="custom" />
      ));

      const element = container.firstElementChild;

      expect(renderFn.mock.calls.length).to.be.greaterThan(0);
      const [firstCallProps, firstCallState] = renderFn.mock.calls[0];
      expect(firstCallProps).to.include({
        class: 'test-component',
        'data-testid': 'custom',
      });
      expect(firstCallProps.style).to.deep.equal({ padding: '10px' });
      expect(firstCallState).to.deep.equal({ active: true });
      expect(element?.tagName).to.equal('SPAN');
      expect(element).to.have.attribute('data-testid', 'custom');
      expect(element).to.have.attribute('data-active', 'true');
    });

    it('accepts render as a React element and clones it with merged props', async () => {
      function CustomElement(props: ComponentProps<'span'>) {
        return <span {...props} />;
      }

      const { container } = render(() => (
        <TestComponent
          active
          render={(props) => <CustomElement {...props} data-active="true" />}
          data-testid="custom"
        />
      ));

      const element = container.firstElementChild;

      expect(element?.tagName).to.equal('SPAN');
      expect(element).to.have.attribute('data-testid', 'custom');
      expect(element).to.have.attribute('data-active', 'true');
    });

    it('forwards ref to render element', async () => {
      function CustomElement(props: ComponentProps<'div'>) {
        return <div {...props} />;
      }

      let ref: HTMLDivElement | null | undefined;
      const { container } = render(() => (
        <TestComponent
          ref={(el) => {
            ref = el;
          }}
          render={(props) => <CustomElement {...props} />}
        />
      ));
      const element = container.firstElementChild;
      expect(ref).to.equal(element);
    });

    it('merges class from render element and component props', async () => {
      const { container } = render(() => (
        <TestComponent
          active
          class="component-class"
          render={(props) => <div {...props} class={`${props.class} render-class`} />}
        />
      ));

      const element = container.firstElementChild;

      expect(element?.className).to.contain('component-class');
      expect(element?.className).to.contain('render-class');
      expect(element?.className).to.contain('test-component');
    });

    it('merges class function with render element', async () => {
      const { container } = render(() => (
        <TestComponent
          active
          class={(state) => (state.active ? 'active-class' : '')}
          render={(props) => <div {...props} class={`${props.class} render-class`} />}
        />
      ));

      const element = container.firstElementChild;

      expect(element?.className).to.contain('active-class');
      expect(element?.className).to.contain('render-class');
      expect(element?.className).to.contain('test-component');
    });

    it('merges style from render element and component props', async () => {
      const { container } = render(() => (
        <TestComponent
          active
          style={{ color: 'rgb(255, 0, 0)' }}
          render={(props) => {
            const mergedProps = solidMergeProps(props, { style: { 'font-size': '16px' } });
            return <div {...mergedProps} />;
          }}
        />
      ));

      const element = container.firstElementChild as HTMLElement;
      expect(element.style.padding).to.equal('10px');
      expect(element.style.color).to.equal('rgb(255, 0, 0)');
      expect(element.style.fontSize).to.equal('16px');
    });

    it('merges style function with render element', async () => {
      const { container } = render(() => (
        <TestComponent
          active
          style={(state) => ({ color: state.active ? 'rgb(255, 0, 0)' : 'rgb(0, 0, 0)' })}
          render={(props) => {
            const mergedProps = solidMergeProps(props, { style: { 'font-size': '16px' } });
            return <div {...mergedProps} />;
          }}
        />
      ));

      const element = container.firstElementChild as HTMLElement;
      expect(element.style.padding).to.equal('10px');
      expect(element.style.color).to.equal('rgb(255, 0, 0)');
      expect(element.style.fontSize).to.equal('16px');
    });

    it('handles lazy elements', async () => {
      const LazyComponent = lazy(() =>
        Promise.resolve({
          default: (props: ComponentProps<'div'>) => <div data-lazy="true" {...props} />,
        }),
      );

      render(() => (
        <Suspense fallback={<div>Loading…</div>}>
          <TestComponent
            active
            render={(props) => <LazyComponent {...props} data-testid="lazy" />}
          />
        </Suspense>
      ));

      const element = await screen.findByTestId('lazy');
      expect(element).to.not.equal(null);

      expect(element?.getAttribute('data-testid')).to.equal('lazy');
      expect(element?.getAttribute('data-lazy')).to.equal('true');
      expect(element?.className).to.contain('test-component');
    });

    it('handles render element with existing ref', async () => {
      const CustomElement = (props: ComponentProps<'div'>) => <div {...props} />;

      let renderRef: HTMLDivElement | null | undefined;
      let componentRef: HTMLDivElement | null | undefined;

      render(() => (
        <TestComponent
          ref={(el) => {
            componentRef = el;
          }}
          render={(props) => (
            <CustomElement
              {...props}
              ref={(el) => {
                renderRef = el;
                props.ref(el);
              }}
            />
          )}
        />
      ));

      expect(renderRef).to.be.instanceOf(HTMLDivElement);
      expect(componentRef).to.be.instanceOf(HTMLDivElement);
      expect(renderRef).to.equal(componentRef);
    });
  });

  describe('fine-grained reactivity', () => {
    function ReactiveTestComponent(props: {
      active: () => boolean;
      componentProps?: BaseUIComponentProps<'div', { active: boolean }>;
      onChildMount: () => void;
      onChildCleanup: () => void;
    }) {
      function Child() {
        onMount(() => props.onChildMount());
        onCleanup(() => props.onChildCleanup());
        return <span data-testid="child">child</span>;
      }

      const componentProps = () => props.componentProps ?? {};
      const element = useRenderElement('div', componentProps(), {
        state: {
          get active() {
            return props.active();
          },
        },
        props: [
          componentProps(),
          {
            class: 'test-component',
            get ['data-count']() {
              return props.active() ? '1' : '0';
            },
          } as BaseUIComponentProps<'div', { active: boolean }>,
        ],
        children: <Child />,
      });

      return <>{element()}</>;
    }

    it('does not remount children when reactive state field toggles', async () => {
      const mountSpy = vi.fn();
      const cleanupSpy = vi.fn();
      const [active, setActive] = createSignal(false);

      const { container } = render(() => (
        <ReactiveTestComponent
          active={active}
          onChildMount={() => mountSpy()}
          onChildCleanup={() => cleanupSpy()}
        />
      ));

      const element = container.firstElementChild as HTMLElement;

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
      expect(element.hasAttribute('data-active')).to.equal(false);

      setActive(true);
      await flushMicrotasks();
      expect(element.hasAttribute('data-active')).to.equal(true);

      setActive(false);
      await flushMicrotasks();
      expect(element.hasAttribute('data-active')).to.equal(false);

      setActive(true);
      await flushMicrotasks();
      expect(element.hasAttribute('data-active')).to.equal(true);

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
    });

    it('does not remount children when reactive class function changes', async () => {
      const mountSpy = vi.fn();
      const cleanupSpy = vi.fn();
      const [active, setActive] = createSignal(false);

      const { container } = render(() => (
        <ReactiveTestComponent
          active={active}
          componentProps={{
            class: (state) => (state.active ? 'on' : 'off'),
          }}
          onChildMount={() => mountSpy()}
          onChildCleanup={() => cleanupSpy()}
        />
      ));

      const element = container.firstElementChild as HTMLElement;

      expect(element.className).to.contain('off');
      expect(mountSpy.mock.calls.length).to.equal(1);

      setActive(true);
      await flushMicrotasks();
      expect(element.className).to.contain('on');

      setActive(false);
      await flushMicrotasks();
      expect(element.className).to.contain('off');

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
    });

    it('does not remount children when reactive style function changes', async () => {
      const mountSpy = vi.fn();
      const cleanupSpy = vi.fn();
      const [active, setActive] = createSignal(false);

      const { container } = render(() => (
        <ReactiveTestComponent
          active={active}
          componentProps={{
            style: (state) => ({
              color: state.active ? 'rgb(255, 0, 0)' : 'rgb(0, 0, 255)',
            }),
          }}
          onChildMount={() => mountSpy()}
          onChildCleanup={() => cleanupSpy()}
        />
      ));

      const element = container.firstElementChild as HTMLElement;

      expect(element.style.color).to.equal('rgb(0, 0, 255)');
      expect(mountSpy.mock.calls.length).to.equal(1);

      setActive(true);
      await flushMicrotasks();
      expect(element.style.color).to.equal('rgb(255, 0, 0)');

      setActive(false);
      await flushMicrotasks();
      expect(element.style.color).to.equal('rgb(0, 0, 255)');

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
    });

    it('does not remount children when a reactive spread prop (getter) updates', async () => {
      const mountSpy = vi.fn();
      const cleanupSpy = vi.fn();
      const [active, setActive] = createSignal(false);

      const { container } = render(() => (
        <ReactiveTestComponent
          active={active}
          onChildMount={() => mountSpy()}
          onChildCleanup={() => cleanupSpy()}
        />
      ));

      const element = container.firstElementChild as HTMLElement;

      expect(element.getAttribute('data-count')).to.equal('0');

      setActive(true);
      await flushMicrotasks();
      expect(element.getAttribute('data-count')).to.equal('1');

      setActive(false);
      await flushMicrotasks();
      expect(element.getAttribute('data-count')).to.equal('0');

      setActive(true);
      await flushMicrotasks();
      expect(element.getAttribute('data-count')).to.equal('1');

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
    });

    it('children mount exactly once across many open/close-like toggles', async () => {
      const mountSpy = vi.fn();
      const cleanupSpy = vi.fn();
      const [active, setActive] = createSignal(false);

      render(() => (
        <ReactiveTestComponent
          active={active}
          onChildMount={() => mountSpy()}
          onChildCleanup={() => cleanupSpy()}
        />
      ));

      expect(mountSpy.mock.calls.length).to.equal(1);

      for (let i = 0; i < 6; i += 1) {
        setActive((prev) => !prev);
        // eslint-disable-next-line no-await-in-loop
        await flushMicrotasks();
      }

      expect(mountSpy.mock.calls.length).to.equal(1);
      expect(cleanupSpy.mock.calls.length).to.equal(0);
    });

    describe('children passed via componentProps', () => {
      function makeChild(onChildMount: () => void, onChildCleanup: () => void) {
        return function Child() {
          onMount(() => onChildMount());
          onCleanup(() => onChildCleanup());
          return <span data-testid="child">child</span>;
        };
      }

      it('does not remount children passed as componentProps.children (static JSX)', async () => {
        const mountSpy = vi.fn();
        const cleanupSpy = vi.fn();
        const [active, setActive] = createSignal(false);
        const Child = makeChild(mountSpy, cleanupSpy);

        function TestWrapper() {
          const componentProps: BaseUIComponentProps<'div', { active: boolean }> = {
            children: <Child />,
          };
          const element = useRenderElement('div', componentProps, {
            state: {
              get active() {
                return active();
              },
            },
            props: [componentProps],
          });
          return <>{element()}</>;
        }

        render(() => <TestWrapper />);

        expect(mountSpy.mock.calls.length).to.equal(1);

        for (let i = 0; i < 5; i += 1) {
          setActive((prev) => !prev);
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
        }

        expect(mountSpy.mock.calls.length).to.equal(1);
        expect(cleanupSpy.mock.calls.length).to.equal(0);
      });

      it('does not remount children passed as componentProps.children via a reactive getter', async () => {
        const mountSpy = vi.fn();
        const cleanupSpy = vi.fn();
        const [active, setActive] = createSignal(false);
        const Child = makeChild(mountSpy, cleanupSpy);

        function TestWrapper(outerProps: { children?: JSX.Element }) {
          const componentProps: BaseUIComponentProps<'div', { active: boolean }> = {
            get children() {
              return outerProps.children;
            },
          };
          const element = useRenderElement('div', componentProps, {
            state: {
              get active() {
                return active();
              },
            },
            props: [componentProps],
          });
          return <>{element()}</>;
        }

        render(() => (
          <TestWrapper>
            <Child />
          </TestWrapper>
        ));

        expect(mountSpy.mock.calls.length).to.equal(1);

        for (let i = 0; i < 5; i += 1) {
          setActive((prev) => !prev);
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
        }

        expect(mountSpy.mock.calls.length).to.equal(1);
        expect(cleanupSpy.mock.calls.length).to.equal(0);
      });

      it('does not remount children passed as componentProps.children via a getter returning a fragment', async () => {
        const mountSpy = vi.fn();
        const cleanupSpy = vi.fn();
        const [active, setActive] = createSignal(false);
        const Child = makeChild(mountSpy, cleanupSpy);

        function TestWrapper(outerProps: { children?: JSX.Element }) {
          const componentProps: BaseUIComponentProps<'div', { active: boolean }> = {
            get children() {
              return <>{outerProps.children}</>;
            },
          };
          const element = useRenderElement('div', componentProps, {
            state: {
              get active() {
                return active();
              },
            },
            props: [componentProps],
          });
          return <>{element()}</>;
        }

        render(() => (
          <TestWrapper>
            <Child />
          </TestWrapper>
        ));

        expect(mountSpy.mock.calls.length).to.equal(1);

        for (let i = 0; i < 5; i += 1) {
          setActive((prev) => !prev);
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
        }

        expect(mountSpy.mock.calls.length).to.equal(1);
        expect(cleanupSpy.mock.calls.length).to.equal(0);
      });

      it('does not remount sibling sub-components that themselves call useRenderElement (Collapsible-shape regression)', async () => {
        const triggerMountSpy = vi.fn();
        const triggerCleanupSpy = vi.fn();
        const panelMountSpy = vi.fn();
        const panelCleanupSpy = vi.fn();
        const panelBodyMountSpy = vi.fn();
        const panelBodyCleanupSpy = vi.fn();
        const [open, setOpen] = createSignal(false);
        const [mounted] = createSignal(true);
        const [transitionStatus, setTransitionStatus] = createSignal<
          'idle' | 'starting' | 'ending'
        >('idle');

        const TestContext = {
          state: {
            get open() {
              return open();
            },
            get mounted() {
              return mounted();
            },
            get transitionStatus() {
              return transitionStatus();
            },
          },
        };

        function PanelBody() {
          onMount(() => panelBodyMountSpy());
          onCleanup(() => panelBodyCleanupSpy());
          return <span data-testid="panel-body">panel body</span>;
        }

        function Trigger() {
          onMount(() => triggerMountSpy());
          onCleanup(() => triggerCleanupSpy());

          const componentProps: BaseUIComponentProps<
            'button',
            { open: boolean; mounted: boolean; transitionStatus: string }
          > = {};
          const element = useRenderElement('button', componentProps, {
            state: TestContext.state,
            props: [
              componentProps,
              {
                get ['aria-expanded']() {
                  return open();
                },
                onClick: () => setOpen((v) => !v),
              },
            ],
          });
          return <>{element()}</>;
        }

        function Panel() {
          onMount(() => panelMountSpy());
          onCleanup(() => panelCleanupSpy());

          const shouldRender = () => mounted();

          const componentProps: BaseUIComponentProps<
            'div',
            { open: boolean; mounted: boolean; transitionStatus: string }
          > = {
            children: <PanelBody />,
          };
          const element = useRenderElement('div', componentProps, {
            state: TestContext.state,
            props: [
              componentProps,
              {
                get ['data-open']() {
                  return open() ? '' : undefined;
                },
              } as BaseUIComponentProps<
                'div',
                { open: boolean; mounted: boolean; transitionStatus: string }
              >,
            ],
          });
          // Mirrors CollapsiblePanel: `<Show when={shouldRender()}>{element()}</Show>`
          return <Show when={shouldRender()}>{element()}</Show>;
        }

        function Root(outerProps: { children?: JSX.Element }) {
          const componentProps: BaseUIComponentProps<
            'div',
            { open: boolean; mounted: boolean; transitionStatus: string }
          > = {
            get children() {
              return outerProps.children;
            },
          };
          const element = useRenderElement('div', componentProps, {
            state: TestContext.state,
            props: [componentProps],
          });
          return <>{element()}</>;
        }

        render(() => (
          <Root>
            <Trigger />
            <Panel />
          </Root>
        ));

        expect(triggerMountSpy.mock.calls.length).to.equal(1);
        expect(panelMountSpy.mock.calls.length).to.equal(1);
        expect(panelBodyMountSpy.mock.calls.length).to.equal(1);

        // Mirror the open/close cycle the Collapsible demo goes through:
        // click -> open=true, starting, idle; click -> open=false, ending, idle
        for (let i = 0; i < 3; i += 1) {
          setOpen(true);
          setTransitionStatus('starting');
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
          setTransitionStatus('idle');
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
          setOpen(false);
          setTransitionStatus('ending');
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
          setTransitionStatus('idle');
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
        }

        expect(triggerMountSpy.mock.calls.length).to.equal(1);
        expect(triggerCleanupSpy.mock.calls.length).to.equal(0);
        expect(panelMountSpy.mock.calls.length).to.equal(1);
        expect(panelCleanupSpy.mock.calls.length).to.equal(0);
        expect(panelBodyMountSpy.mock.calls.length).to.equal(1);
        expect(panelBodyCleanupSpy.mock.calls.length).to.equal(0);
      });

      it('does not remount children passed via componentProps.render object', async () => {
        const mountSpy = vi.fn();
        const cleanupSpy = vi.fn();
        const [active, setActive] = createSignal(false);
        const Child = makeChild(mountSpy, cleanupSpy);

        function TestWrapper() {
          const componentProps: BaseUIComponentProps<'div', { active: boolean }> = {
            render: {
              component: 'div',
              children: <Child />,
            },
          };
          const element = useRenderElement('div', componentProps, {
            state: {
              get active() {
                return active();
              },
            },
            props: [componentProps],
          });
          return <>{element()}</>;
        }

        render(() => <TestWrapper />);

        expect(mountSpy.mock.calls.length).to.equal(1);

        for (let i = 0; i < 5; i += 1) {
          setActive((prev) => !prev);
          // eslint-disable-next-line no-await-in-loop
          await flushMicrotasks();
        }

        expect(mountSpy.mock.calls.length).to.equal(1);
        expect(cleanupSpy.mock.calls.length).to.equal(0);
      });
    });
  });
});
