import { createRenderer, describeConformance } from '#test-utils';
import { Toggle } from '@msviderok/base-ui-solid/toggle';
import { screen } from '@solidjs/testing-library';
import { expect } from 'chai';
import { spy } from 'sinon';
import { createSignal, type ComponentProps } from 'solid-js';
import { ToggleGroup } from '../toggle-group/ToggleGroup';

describe('<Toggle />', () => {
  const { render } = createRenderer();

  describeConformance(Toggle, () => ({
    refInstanceof: window.HTMLButtonElement,
    testComponentPropWith: 'button',
    button: true,
    render,
  }));

  describe('pressed state', () => {
    it('controlled', async () => {
      function App() {
        const [pressed, setPressed] = createSignal(false);
        return (
          <div>
            <input type="checkbox" checked={pressed()} onChange={() => setPressed(!pressed())} />
            <Toggle pressed={pressed()} />;
          </div>
        );
      }

      render(() => <App />);
      const checkbox = screen.getByRole('checkbox');
      const button = screen.getByRole('button');

      expect(button).to.have.attribute('aria-pressed', 'false');

      checkbox.click();

      expect(button).to.have.attribute('aria-pressed', 'true');

      checkbox.click();

      expect(button).to.have.attribute('aria-pressed', 'false');
    });

    it('uncontrolled', async () => {
      render(() => <Toggle defaultPressed={false} />);

      const button = screen.getByRole('button');

      expect(button).to.have.attribute('aria-pressed', 'false');
      button.click();

      expect(button).to.have.attribute('aria-pressed', 'true');

      button.click();

      expect(button).to.have.attribute('aria-pressed', 'false');
    });
  });

  describe('prop: onPressedChange', () => {
    it('is called when the pressed state changes', async () => {
      const handlePressed = spy();
      render(() => <Toggle defaultPressed={false} onPressedChange={handlePressed} />);

      const button = screen.getByRole('button');

      button.click();

      expect(handlePressed.callCount).to.equal(1);
      expect(handlePressed.firstCall.args[0]).to.equal(true);
    });
  });

  describe('prop: disabled', () => {
    it('disables the component', async () => {
      const handlePressed = spy();
      render(() => <Toggle disabled onPressedChange={handlePressed} />);

      const button = screen.getByRole('button');

      expect(button).to.have.attribute('disabled');
      expect(button).to.have.attribute('data-disabled');
      expect(button).to.have.attribute('aria-pressed', 'false');

      button.click();

      expect(handlePressed.callCount).to.equal(0);
      expect(button).to.have.attribute('aria-pressed', 'false');
    });
  });

  describe('prop: render', () => {
    it('should pass composite props', () => {
      const renderSpy = spy();

      function ToggleRenderComponent(props: { renderProps: ComponentProps<'button'> }) {
        // eslint-disable-next-line solid/reactivity
        renderSpy(props.renderProps);
        return <button type="button" {...props.renderProps} />;
      }

      render(() => (
        <ToggleGroup defaultValue={['left']}>
          <Toggle value="left" render={(props) => <ToggleRenderComponent renderProps={props} />} />
        </ToggleGroup>
      ));

      expect(renderSpy.lastCall.args[0]).to.have.property('tabIndex', 0);
    });
  });
});
