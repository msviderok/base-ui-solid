import type { JSX } from 'solid-js';

export function NpmIcon(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      fill="currentcolor"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0V16H16V0H0ZM13 3H3V13H8V5H11V13H13V3Z" />
    </svg>
  );
}
