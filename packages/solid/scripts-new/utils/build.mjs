import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import url from 'node:url';

/**
 * @typedef {'esm' | 'cjs'} BundleType
 */

export const isMjsBuild = !!process.env.MUI_EXPERIMENTAL_MJS;

/**
 * @param {BundleType} bundle
 * @param {boolean} [isType=false]
 */
export function getOutExtension(bundle, isType = false) {
  if (isType) {
    if (!isMjsBuild) {
      return '.d.ts';
    }

    return bundle === 'esm' ? '.d.mts' : '.d.ts';
  }

  if (!isMjsBuild) {
    return '.js';
  }

  return bundle === 'esm' ? '.mjs' : '.js';
}

function findUpFile(fileName, cwd = process.cwd(), maxIterations = 10) {
  const pathName = path.join(cwd, fileName);
  if (fs.existsSync(pathName)) {
    return pathName;
  }

  if (maxIterations === 0) {
    return null;
  }

  const nextDirectory = path.dirname(cwd);
  if (nextDirectory === cwd) {
    return null;
  }

  return findUpFile(fileName, nextDirectory, maxIterations - 1);
}

export function getWorkspaceRoot(cwd = process.cwd()) {
  if (process.env.NX_WORKSPACE_ROOT) {
    return process.env.NX_WORKSPACE_ROOT;
  }

  const workspaceFilePath = findUpFile('pnpm-workspace.yaml', cwd);
  if (workspaceFilePath) {
    return path.dirname(workspaceFilePath);
  }

  const currentDirectory = url.fileURLToPath(new URL('.', import.meta.url));
  return path.resolve(currentDirectory, '..', '..', '..', '..');
}

/**
 * Keep validation intentionally light for Solid until its source package.json
 * fully matches the React package metadata conventions.
 *
 * @param {Record<string, any>} packageJson
 */
export function validatePkgJson(packageJson) {
  const errors = [];

  if (!packageJson.publishConfig?.directory) {
    errors.push(
      `No build directory specified in "${packageJson.name}" package.json. ` +
        'Specify it in the "publishConfig.directory" field.',
    );
  }

  if (!packageJson.exports) {
    errors.push(
      `No exports field specified in "${packageJson.name}" package.json. ` +
        'Define source exports so the build can generate the published package manifest.',
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

export const BASE_IGNORES = [
  '**/*.test.js',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.js',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.d.ts',
  '**/*.test/*.*',
  '**/test-cases/*.*',
];

/**
 * @template T
 * @template R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} mapper
 * @param {number} concurrency
 * @returns {Promise<(R | Error)[]>}
 */
export async function mapConcurrently(items, mapper, concurrency) {
  if (!items.length) {
    return [];
  }

  const itemIterator = items.entries();
  const count = Math.min(concurrency, items.length);
  const workers = [];
  const results = new Array(items.length);

  for (let i = 0; i < count; i += 1) {
    workers.push(
      Promise.resolve().then(async () => {
        for (const [index, item] of itemIterator) {
          results[index] = await mapper(item);
        }
      }),
    );
  }

  await Promise.all(workers);
  return results;
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string; env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' }} [options]
 */
export function runCommand(command, args, options = {}) {
  const { cwd = process.cwd(), env = process.env, stdio = 'inherit' } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio,
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(
        new Error(
          signal
            ? `Command "${command} ${args.join(' ')}" terminated with signal ${signal}.`
            : `Command "${command} ${args.join(' ')}" failed with exit code ${code}.`,
        ),
      );
    });
  });
}
