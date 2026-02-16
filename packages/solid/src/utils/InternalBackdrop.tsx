import { createMemo, JSX, splitProps } from 'solid-js';
import { createAttribute } from '../floating-ui-solid/utils/createAttribute';

/**
 * @internal
 */
export function InternalBackdrop(props: InternalBackdrop.Props) {
  const [local, otherProps] = splitProps(props, ['cutout', 'managed']);

  const clipPath = createMemo(() => {
    if (local.cutout) {
      const rect = local.cutout?.getBoundingClientRect();
      return `polygon(
      0% 0%,
      100% 0%,
      100% 100%,
      0% 100%,
      0% 0%,
      ${rect.left}px ${rect.top}px,
      ${rect.left}px ${rect.bottom}px,
      ${rect.right}px ${rect.bottom}px,
      ${rect.right}px ${rect.top}px,
      ${rect.left}px ${rect.top}px
    )`;
    }

    return undefined;
  });

  const ownerProps = () => (local.managed ? { [createAttribute('managed')]: local.managed } : {});

  return (
    <div
      ref={props.ref}
      role="presentation"
      // Ensures Floating UI's outside press detection runs, as it considers
      // it an element that existed when the popup rendered.
      data-base-ui-inert=""
      {...otherProps}
      {...ownerProps()}
      style={{
        position: 'fixed',
        inset: 0,
        'user-select': 'none',
        '-webkit-user-select': 'none',
        'clip-path': clipPath(),
      }}
    />
  );
}

export interface InternalBackdropProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The element to cut out of the backdrop.
   * This is useful for allowing certain elements to be interactive while the backdrop is present.
   */
  cutout?: (Element | null) | undefined;
  /**
   * Whether the backdrop is managed by Base UI.
   */
  managed?: boolean;
}

export namespace InternalBackdrop {
  export type Props = InternalBackdropProps;
}
