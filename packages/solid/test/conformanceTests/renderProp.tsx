import { randomStringValue } from '@mui/internal-test-utils';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { splitProps, type Component, type ParentComponent } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type {
  BaseUiConformanceTestsOptions,
  ConformantComponentProps,
} from '../describeConformance';
import { throwMissingPropError } from './utils';

export function testRenderProp(
  element: Component<ConformantComponentProps>,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const { render, testRenderPropWith: Element = 'div', button = false } = getOptions();

  if (!render) {
    throwMissingPropError('render');
  }

  const nativeButton = Element === 'button';

  const Wrapper: ParentComponent = (props) => {
    return (
      <div data-testid="base-ui-wrapper">
        <Dynamic component={Element} {...props} data-testid="wrapped" />
      </div>
    );
  };

  describe('prop: render', () => {
    it('renders a customized root element with a function', () => {
      const testValue = randomStringValue();
      render(element, {
        render: (props: any) => <Wrapper {...props} data-test-value={testValue} />,
        ...(button && { nativeButton }),
      });

      expect(screen.queryByTestId('base-ui-wrapper')).not.to.equal(null);
      expect(screen.queryByTestId('wrapped')).not.to.equal(null);
      expect(screen.queryByTestId('wrapped')).to.have.attribute('data-test-value', testValue);
    });

    it('renders a customized root element with an implicit Dynamic element', () => {
      const testValue = randomStringValue();
      render(element, {
        render: { component: Wrapper, 'data-test-value': testValue },
        ...(button && { nativeButton }),
      });

      expect(screen.queryByTestId('base-ui-wrapper')).not.to.equal(null);
      expect(screen.queryByTestId('wrapped')).not.to.equal(null);
      expect(screen.queryByTestId('wrapped')).to.have.attribute('data-test-value', testValue);
    });

    it('renders a customized root element with an element', () => {
      render(element as any, {
        render: Wrapper,
        ...(button && { nativeButton: Element === 'button' }),
      });

      expect(document.querySelector('[data-testid="base-ui-wrapper"]')).not.to.equal(null);
    });

    it('should pass the ref to the custom component', () => {
      let instanceFromRef: any;

      function Test() {
        return (
          <Dynamic
            component={element}
            ref={instanceFromRef}
            render={(props) => <Wrapper {...props} />}
            data-testid="wrapped"
            {...(button && { nativeButton })}
          />
        );
      }

      render(() => <Test />);
      expect(instanceFromRef!.tagName).to.equal(Element.toUpperCase());
      expect(instanceFromRef!).to.have.attribute('data-testid', 'wrapped');
    });

    it('should merge the rendering element ref with the custom component ref', () => {
      let refA = null as HTMLElement | null;
      let refB = null as HTMLElement | null;

      function Test() {
        return (
          <Dynamic
            component={element}
            ref={(el: any) => {
              refA = el;
            }}
            render={{
              component: Wrapper,
              ref: (el: any) => {
                refB = el;
              },
            }}
            data-testid="wrapped"
            {...(button && { nativeButton })}
          />
        );
      }

      render(() => <Test />);

      expect(refA).not.to.equal(null);
      expect(refA!.tagName).to.equal(Element.toUpperCase());
      expect(refA!).to.have.attribute('data-testid', 'wrapped');
      expect(refB).not.to.equal(null);
      expect(refB!.tagName).to.equal(Element.toUpperCase());
      expect(refB!).to.have.attribute('data-testid', 'wrapped');
    });

    it('should merge the rendering element class with the custom component class', () => {
      function Test() {
        return (
          <Dynamic
            component={element}
            class="component-classname"
            data-testid="test-component"
            {...(button && { nativeButton })}
            render={(props) => (
              <Dynamic
                component={Element}
                {...props}
                class={`${props.class} render-prop-classname`}
              />
            )}
          />
        );
      }

      render(() => <Test />);

      const component = screen.getByTestId('test-component');
      expect(component.classList.contains('component-classname')).to.equal(true);
      expect(component.classList.contains('render-prop-classname')).to.equal(true);
    });

    it('should merge the rendering element resolved className with the custom component className', () => {
      function Test() {
        return (
          <Dynamic
            component={element}
            class={() => 'conditional-component-classname'}
            data-testid="test-component"
            {...(button && { nativeButton })}
            render={(props) => (
              <Dynamic
                component={Element}
                {...props}
                class={`${props.class} render-prop-classname`}
              />
            )}
          />
        );
      }

      render(() => <Test />);

      const component = screen.getByTestId('test-component');
      expect(component.classList.contains('conditional-component-classname')).to.equal(true);
      expect(component.classList.contains('render-prop-classname')).to.equal(true);
    });
  });
}
