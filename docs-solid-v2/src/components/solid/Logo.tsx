import type { JSX } from 'solid-js';

export function Logo(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-3 0 20 27"
      fill="none"
      width="17"
      height="24"
      {...props}
    >
      <defs>
        <linearGradient id="b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a2d0f2" />
          <stop offset="100%" stop-color="#76b3e1" />
        </linearGradient>
        <linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f82b7" />
          <stop offset="100%" stop-color="#2c4f7c" />
        </linearGradient>
      </defs>
      <path d="M7.7 8.815a.477.477 0 0 0-.5.485v15.5a8 8 0 0 0 .5-15.985" fill="#1a365d" />
      <path d="M9.5 7.02 7.2 9.3v15.5L9.5 23Z" fill="#1a365d" />
      <path d="m9 23-1.8 1.8 5.657-2.343 1.8-1.8Z" fill="#1a365d" />
      <path d="M9.5 7.015V23c3.918 0 7.5-3.582 7.5-8a8 8 0 0 0-7.5-7.985" fill="url(#a)" />
      <path
        d="M6.24 11.6v13.2c-4.458 0-8.04-3.94-8.04-8.8V2.8c4.418 0 8 3.94 8.01 8.8Z"
        fill="#4f82b7"
      />
      <path d="m0 1-1.8 1.8V16L0 14.2Zm8 8.8-1.8 1.8v13.2L8 23Z" fill="#4f82b7" />
      <path d="M8 9.8V23c-4.418 0-8-3.94-8-8.8V1c4.418 0 8 3.94 8 8.8" fill="url(#b)" />
    </svg>
  );
}
