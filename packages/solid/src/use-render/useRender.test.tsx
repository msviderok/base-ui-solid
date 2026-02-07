/* eslint-disable testing-library/render-result-naming-convention */
import { createRenderer } from '#test-utils';
import { expect } from 'chai';
import { createSignal, splitProps, type ComponentProps, type JSX } from 'solid-js';
import { useRender } from './useRender';

describe('useRender', () => {
  const { render } = createRenderer();

  it('render props does not overwrite class in a render function when unspecified', async () => {
    function TestComponent(props: {
      render: useRender.Parameters<{}, Element, undefined>['render'];
      class?: string;
    }) {
      const element = useRender(props);
      return <>{element()}</>;
    }

    const { container } = render(() => (
      <TestComponent
        render={(props: any, state: any) => (
          <span {...props} class={`my-span ${props.class ?? ''}`} {...state} />
        )}
      />
    ));

    const element = container.firstElementChild;

    expect(element).to.have.attribute('class', 'my-span ');
  });

  it('refs are handled as expected', async () => {
    const refs: (HTMLElement | undefined)[] = [];

    function TestComponent(
      props: {
        render: useRender.Parameters<{}, Element, undefined>['render'];
        class?: string;
      } & ComponentProps<'span'>,
    ) {
      const [local, otherProps] = splitProps(props, ['render']);

      const element = useRender({
        // eslint-disable-next-line solid/reactivity
        render: local.render,
        ref: (el: HTMLElement) => {
          refs[0] = el;
          refs[1] = el;
        },
        props: otherProps,
      });
      return <>{element()}</>;
    }

    const { container } = render(() => (
      <TestComponent render={(props: any, state: any) => <span {...props} {...state} />} />
    ));
    expect(refs.length).to.equal(2);

    refs.forEach((ref) => {
      expect(ref).to.deep.equal(container.firstElementChild);
    });
  });

  describe('param: defaultTagName', () => {
    it('renders div by default if no defaultTagName and no render params are provided', async () => {
      function TestComponent() {
        return <>{useRender({})}</>;
      }

      const { container } = render(() => <TestComponent />);
      expect(container.firstElementChild).to.have.property('tagName', 'DIV');
    });

    it('renders the element with the default tag with no render prop', async () => {
      function TestComponent(props: { defaultTagName: keyof JSX.IntrinsicElements }) {
        return <>{useRender({ defaultTagName: props.defaultTagName })}</>;
      }

      const [defaultTagName, setDefaultTagName] = createSignal<keyof JSX.IntrinsicElements>('div');
      const { container } = render(() => <TestComponent defaultTagName={defaultTagName()} />);
      expect(container.firstElementChild).to.have.property('tagName', 'DIV');

      setDefaultTagName('span');
      expect(container.firstElementChild).to.have.property('tagName', 'SPAN');
    });

    it('is overwritten by the render prop', async () => {
      function TestComponent(props: {
        render: useRender.Parameters<{}, Element, undefined>['render'];
        defaultTagName: keyof JSX.IntrinsicElements;
      }) {
        return <>{useRender({ render: props.render, defaultTagName: props.defaultTagName })}</>;
      }

      const [defaultTagName, setDefaultTagName] = createSignal<keyof JSX.IntrinsicElements>('div');
      const { container } = render(() => (
        <TestComponent defaultTagName={defaultTagName()} render="span" />
      ));
      expect(container.firstElementChild).to.have.property('tagName', 'SPAN');

      setDefaultTagName('a');
      expect(container.firstElementChild).to.have.property('tagName', 'SPAN');
    });
  });

  describe('state to data attributes', () => {
    it('converts state to data attributes automatically', async () => {
      function TestComponent() {
        const element = useRender({
          render: (p) => <button {...p} type="button" />,
          state: {
            active: true,
            index: 42,
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).to.have.attribute('data-active', '');
      expect(button).to.have.attribute('data-index', '42');
    });

    it('handles undefined values in state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: {
            defined: 'value',
            notDefined: undefined,
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).to.have.attribute('data-defined', 'value');
      expect(div).not.to.have.attribute('data-notdefined');
    });

    it('merges state-based data attributes with existing props', async () => {
      function TestComponent() {
        const element = useRender({
          render: (p) => <button {...p} type="button" />,
          state: {
            form: 'login',
          },
          props: {
            class: 'btn-primary',
            id: 'submit-btn',
            'data-existing': 'prop',
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).to.have.attribute('data-form', 'login');

      expect(button).to.have.attribute('class', 'btn-primary');
      expect(button).to.have.attribute('id', 'submit-btn');

      expect(button).to.have.attribute('data-existing', 'prop');
    });

    it('props override state-based data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: (p) => <button {...p} type="button" />,
          state: {
            active: true,
          },
          props: {
            'data-active': 'false',
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).to.have.attribute('data-active', 'false');
    });

    it('handles empty state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'span',
          state: {},
          props: {
            class: 'test-class',
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const span = container.firstElementChild;

      expect(span).to.have.attribute('class', 'test-class');

      const attributes = span?.attributes;
      if (attributes) {
        for (let i = 0; i < attributes.length; i += 1) {
          expect(attributes[i].name).not.to.match(/^data-/);
        }
      }
    });

    it('handles undefined state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: undefined,
          props: {
            class: 'test-class',
            'data-from-props': 'value',
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).to.have.attribute('class', 'test-class');
      expect(div).to.have.attribute('data-from-props', 'value');
    });

    it('converts boolean values in state to data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: (p) => <button {...p} type="button" />,
          state: {
            active: true,
            disabled: false,
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).to.have.attribute('data-active', '');
      expect(button).not.to.have.attribute('data-disabled');
    });

    it('converts number values in state to data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: {
            count: 0,
            index: 42,
            percentage: 99.9,
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).not.to.have.attribute('data-count');
      expect(div).to.have.attribute('data-index', '42');
      expect(div).to.have.attribute('data-percentage', '99.9');
    });

    it('supports custom stateAttributesMapping for kebab-case conversion', async () => {
      function TestComponent() {
        const element = useRender({
          render: (p) => <button {...p} type="button" />,
          state: {
            isActive: true,
            itemCount: 5,
            userName: 'John',
          },
          stateAttributesMapping: {
            isActive: (value) => (value ? { 'data-is-active': '' } : null),
            itemCount: (value) => ({ 'data-item-count': value.toString() }),
            userName: (value) => ({ 'data-user-name': value }),
          },
        });
        return <>{element()}</>;
      }

      const { container } = render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).to.have.attribute('data-is-active', '');
      expect(button).to.have.attribute('data-item-count', '5');
      expect(button).to.have.attribute('data-user-name', 'John');
    });
  });
});
