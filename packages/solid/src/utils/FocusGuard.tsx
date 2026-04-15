import { createSignal, onMount, type ComponentProps } from 'solid-js';
import { isSafari } from './detectBrowser';
import { visuallyHidden } from './visuallyHidden';

/**
 * @internal
 */
export function FocusGuard(props: ComponentProps<'span'>) {
  const [role, setRole] = createSignal<'button' | undefined>();

  onMount(() => {
    if (isSafari) {
      // Unlike other screen readers such as NVDA and JAWS, the virtual cursor
      // on VoiceOver does trigger the onFocus event, so we can use the focus
      // trap element. On Safari, only buttons trigger the onFocus event.
      setRole('button');
    }
  });

  return (
    <span
      {...props}
      ref={props.ref}
      role={role()}
      aria-hidden={role() ? undefined : true}
      style={visuallyHidden}
      tabIndex={0}
      data-base-ui-focus-guard=""
    />
  );
}
