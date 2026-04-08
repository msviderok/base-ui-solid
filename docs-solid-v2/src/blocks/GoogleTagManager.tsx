import type { ParentProps } from 'solid-js';

interface GoogleTagManagerProps {
  id: string;
}

export function GoogleTagManager(props: ParentProps<GoogleTagManagerProps>) {
  return (
    /**
     * TODO: need to figure out if there's a way to delay the execution of the script
     * natively or with a Solid alternative.
     */
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${props.id}`} />
  );
}
