import { flushMicrotasks } from '#test-utils';
import { randomStringValue } from '@mui/internal-test-utils';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type {
  BaseUiConformanceTestsOptions,
  ConformantComponentProps,
} from '../describeConformance';
import { throwMissingPropError } from './utils';

export function testPropForwarding(
  element: Component<ConformantComponentProps>,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const { render, testRenderPropWith: Element = 'div', button = false } = getOptions();

  if (!render) {
    throwMissingPropError('render');
  }

  const nativeButton = Element === 'button';

  describe('prop forwarding', () => {
    it('forwards custom props to the default element', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
      };

      render(element, { 'data-testid': 'root', ...otherProps });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('root');
      expect(customRoot).to.have.attribute('lang', otherProps.lang);
      expect(customRoot).to.have.attribute('data-foobar', otherProps['data-foobar']);
    });

    it('forwards custom props to the customized element defined with a function', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
        ...(button && { nativeButton }),
      };

      render(element, {
        render: (props) => <Dynamic component={Element} {...props} data-testid="custom-root" />,
        ...otherProps,
      });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).to.have.attribute('lang', otherProps.lang);
      expect(customRoot).to.have.attribute('data-foobar', otherProps['data-foobar']);
    });

    /**
     * TODO: figure out if this would need to be supported
     * This is skipped as when the element is a JSX element – Solid has already resolved the element
     */
    it('forwards custom props to the customized element defined using JSX', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
        ...(button && { nativeButton }),
      };

      render(element, {
        render: (props) => <Dynamic component={Element} {...props} data-testid="custom-root" />,
        ...otherProps,
      });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).to.have.attribute('lang', otherProps.lang);
      expect(customRoot).to.have.attribute('data-foobar', otherProps['data-foobar']);
    });

    it('forwards the custom `style` attribute defined on the component', async () => {
      render(element, {
        style: { color: 'green' },
        'data-testid': 'custom-root',
      });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).to.have.attribute('style');
      expect(customRoot.getAttribute('style')).to.contain('color: green');
    });

    it('forwards the custom `style` attribute defined on the render function', async () => {
      render(element, {
        render: (props) => (
          <Dynamic
            component={Element}
            {...props}
            style={{ color: 'green' }}
            data-testid="custom-root"
          />
        ),
        ...(button && { nativeButton }),
      });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).to.have.attribute('style');
      expect(customRoot.getAttribute('style')).to.contain('color: green');
    });

    it('forwards the custom `style` attribute defined on the render function', async () => {
      render(element, {
        render: (props) => (
          <Dynamic
            component={Element}
            {...props}
            style={{ color: 'green' }}
            data-testid="custom-root"
          />
        ),
        ...(button && { nativeButton }),
      });

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).to.have.attribute('style');
      expect(customRoot.getAttribute('style')).to.contain('color: green');
    });
  });
}
