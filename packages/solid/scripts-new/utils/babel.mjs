/* eslint-disable no-console */
import { globby } from 'globby';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BASE_IGNORES, getWorkspaceRoot, runCommand } from './build.mjs';

const TO_TRANSFORM_EXTENSIONS = ['.js', '.ts', '.tsx'];

/**
 * @param {string} pkgVersion
 * @returns {Record<string, string | undefined>}
 */
export function getVersionEnvVariables(pkgVersion) {
  if (!pkgVersion) {
    throw new Error('No version found in package.json');
  }

  const [versionNumber, prerelease] = pkgVersion.split('-');
  const [major, minor, patch] = versionNumber.split('.');

  if (!major || !minor || !patch) {
    throw new Error(`Couldn't parse version from package.json`);
  }

  return {
    MUI_VERSION: pkgVersion,
    MUI_MAJOR_VERSION: major,
    MUI_MINOR_VERSION: minor,
    MUI_PATCH_VERSION: patch,
    MUI_PRERELEASE: prerelease,
  };
}

/**
 * @param {{ from: string; to: string }} param0
 */
export async function cjsCopy({ from, to }) {
  const outDirExists = await fs
    .stat(to)
    .then(() => true)
    .catch(() => false);

  if (!outDirExists) {
    console.warn(`path ${to} does not exist`);
    return;
  }

  const files = await globby('**/*.cjs', { cwd: from });
  await Promise.all(files.map((file) => fs.cp(path.resolve(from, file), path.resolve(to, file))));
}

/**
 * @param {Object} options
 * @param {string} options.cwd
 * @param {string} options.sourceDir
 * @param {string} options.outDir
 * @param {string} options.babelRuntimeVersion
 * @param {boolean} options.hasLargeFiles
 * @param {'esm' | 'cjs'} options.bundle
 * @param {string} options.pkgVersion
 * @param {string} options.outExtension
 * @param {boolean} [options.optimizeClsx=false]
 * @param {boolean} [options.removePropTypes=false]
 * @param {boolean} [options.verbose=false]
 * @param {string[]} [options.ignores=[]]
 */
export async function babelBuild({
  cwd,
  sourceDir,
  outDir,
  babelRuntimeVersion,
  hasLargeFiles,
  bundle,
  pkgVersion,
  outExtension,
  optimizeClsx = false,
  removePropTypes = false,
  verbose = false,
  ignores = [],
}) {
  console.log(
    `Transpiling files to "${path.relative(path.dirname(sourceDir), outDir)}" for "${bundle}" bundle.`,
  );

  const workspaceRoot = getWorkspaceRoot(cwd);
  const candidateConfigs = [
    path.join(cwd, 'babel.config.js'),
    path.join(cwd, 'babel.config.mjs'),
    path.join(workspaceRoot, 'babel.config.js'),
    path.join(workspaceRoot, 'babel.config.mjs'),
  ];

  let configFile = null;
  for (const candidateConfig of candidateConfigs) {
    const configExists = await fs
      .stat(candidateConfig)
      .then((stats) => stats.isFile())
      .catch(() => false);
    if (configExists) {
      configFile = candidateConfig;
      break;
    }
  }

  if (!configFile) {
    throw new Error(`No Babel config found for package build in "${cwd}" or workspace root.`);
  }

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    BABEL_ENV: bundle === 'esm' ? 'stable' : 'node',
    MUI_BUILD_VERBOSE: verbose ? 'true' : undefined,
    MUI_OPTIMIZE_CLSX: optimizeClsx ? 'true' : undefined,
    MUI_REMOVE_PROP_TYPES: removePropTypes ? 'true' : undefined,
    MUI_BABEL_RUNTIME_VERSION: babelRuntimeVersion,
    MUI_OUT_FILE_EXTENSION: outExtension ?? '.js',
    ...getVersionEnvVariables(pkgVersion),
  };

  const args = [
    'exec',
    'babel',
    '--config-file',
    configFile,
    '--extensions',
    TO_TRANSFORM_EXTENSIONS.join(','),
    sourceDir,
    '--out-dir',
    outDir,
    '--ignore',
    BASE_IGNORES.concat(ignores).join(','),
    '--out-file-extension',
    outExtension !== '.js' ? outExtension : '.js',
    '--compact',
    hasLargeFiles ? 'false' : 'auto',
  ];

  await runCommand('pnpm', args, {
    cwd,
    env,
  });

  await cjsCopy({ from: sourceDir, to: outDir });
}
