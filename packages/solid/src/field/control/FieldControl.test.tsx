import { createRenderer, describeConformance, isJSDOM } from '#test-utils';
import { Field } from '@msviderok/base-ui-solid/field';
import { fireEvent, screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { autofocus } from '../../solid-helpers';

// do not treeshake autofocus
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
autofocus;

describe('<Field.Control />', () => {
  const { render } = createRenderer();

  describeConformance(Field.Control, () => ({
    refInstanceof: window.HTMLInputElement,
    render: (node, props) => render(() => <Field.Root>{node(props!)}</Field.Root>),
  }));

  it('avoids rerendering for uncontrolled input changes', async () => {
    const renderCountRef = { current: 0 };

    function RenderCountedControl() {
      renderCountRef.current += 1;
      return <Field.Control data-testid="control" />;
    }

    render(() => (
      <Field.Root>
        <RenderCountedControl />
      </Field.Root>
    ));

    const control = screen.getByTestId('control');
    const initialRenderCount = renderCountRef.current;

    fireEvent.change(control, { target: { value: 'a' } });
    const afterFirstChange = renderCountRef.current;

    fireEvent.change(control, { target: { value: 'ab' } });
    fireEvent.change(control, { target: { value: 'abc' } });

    expect(renderCountRef.current).to.equal(afterFirstChange);
    expect(afterFirstChange).to.be.at.most(initialRenderCount + 1);
  });

  it.skipIf(isJSDOM)('should sync focused state when autoFocus is used with SSR', async () => {
    vi.spyOn(console, 'error')
      .mockName('console.error')
      .mockImplementation(() => {});

    function App() {
      return (
        <Field.Root data-testid="root">
          <Field.Label data-testid="label">Name</Field.Label>
          <Field.Control autofocus use:autofocus />
        </Field.Root>
      );
    }

    render(() => <App />, undefined, { hydrate: true });

    const control = screen.getByRole('textbox');
    expect(control).to.have.attribute('autofocus');

    // Simulate focused by browser before hydration
    control.focus();
    expect(control).to.equal(document.activeElement);

    expect(screen.getByTestId('root')).to.have.attribute('data-focused', '');
    expect(control).to.have.attribute('data-focused', '');
    expect(screen.getByText('Name')).to.have.attribute('data-focused', '');
  });
});
