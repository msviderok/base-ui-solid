interface GetHtmlParameters {
  title: string;
  language: string;
  additionalHeadContent?: string;
}

export const getHtml = ({ title, language, additionalHeadContent }: GetHtmlParameters) => {
  return `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="initial-scale=1, width=device-width" />
    ${additionalHeadContent ?? ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>`;
};

export function getRootIndex(useTypescript: boolean) {
  // document.querySelector returns 'Element | null' but createRoot expects 'Element | DocumentFragment'.
  const type = useTypescript ? '!' : '';

  return `/* @refresh reload */
import { render } from "solid-js/web";
import App from './App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root${type});`;
}

export const getTsconfig = () => `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "jsxImportSource": "solid-js",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;

export const getTsconfigNode = () => `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
`;

export const getViteConfig = () => `import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
});
`;
