/* eslint-disable testing-library/render-result-naming-convention */
import { createRenderer } from '#test-utils';
import { expect } from 'chai';
import { splitProps } from 'solid-js';
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
      props: [{ ...elementProps, class: 'test-component', style: { padding: '10px' } }],
    });

    return <>{element()}</>;
  }

  it('accepts className as function', () => {
    const { container } = render(() => (
      <TestComponent active class={(state) => (state.active ? 'active-class' : 'inactive-class')} />
    ));

    const element = container.firstElementChild;

    expect(element).to.have.attribute('class', 'active-class test-component');
  });

  it('accepts className as function that returns undefined', () => {
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
});
