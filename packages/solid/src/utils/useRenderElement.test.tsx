/* eslint-disable testing-library/render-result-naming-convention */
import { createRenderer } from '#test-utils';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { lazy, splitProps, Suspense, type ComponentProps } from 'solid-js';
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

      let ref!: HTMLDivElement;
      const { container } = render(() => (
        <TestComponent ref={ref} render={(props) => <CustomElement {...props} />} />
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

      let renderRef!: HTMLDivElement;
      let componentRef!: HTMLDivElement;

      render(() => (
        <TestComponent
          ref={componentRef}
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
});
