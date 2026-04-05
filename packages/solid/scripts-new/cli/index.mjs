import { parseArgs } from 'node:util';
import { buildCommand } from './cmdBuild.mjs';

const commands = new Map([[buildCommand.name, buildCommand]]);

function printHelp() {
  const commandNames = Array.from(commands.keys()).join(', ');
  // eslint-disable-next-line no-console
  console.log(`Usage: node ./scripts-new/cli/index.mjs <command> [options]

Commands:
  ${commandNames}

Build options:
  --bundle <esm|cjs>        Repeatable. Defaults to esm and cjs.
  --hasLargeFiles           Disable Babel compact mode.
  --skipBundlePackageJson   Skip writing package.json in bundle subdirectories.
  --cjsOutDir <dir>         Output directory for the CJS bundle. Defaults to .
  --verbose                 Enable verbose build logging.
  --buildTypes              Build declaration files. Enabled by default.
  --skipTsc                 Reuse existing declaration files without running tsc.
  --ignore <glob>           Repeatable. Extra Babel ignore globs.
  --skipBabelRuntimeCheck   Skip @babel/runtime dependency validation.
  --skipPackageJson         Skip generating build/package.json.
  --skipMainCheck           Accepted for parity. No-op in the Solid build.
  --noCheck                 Emit declarations without type-checking.
  --copy <glob[:dir]>       Repeatable. Copy extra files into the build output.
  --help                    Show this help output.
`);
}

function normalizeRepeated(values) {
  if (!values) {
    return undefined;
  }

  return values.flatMap((value) => value.split(',').map((part) => part.trim()).filter(Boolean));
}

async function main() {
  const [commandName, ...commandArgs] = process.argv.slice(2);

  if (!commandName || commandName === '--help' || commandName === '-h') {
    printHelp();
    process.exit(commandName ? 0 : 1);
  }

  const command = commands.get(commandName);
  if (!command) {
    throw new Error(
      `Unknown command "${commandName}". Available commands: ${Array.from(commands.keys()).join(', ')}.`,
    );
  }

  const { values } = parseArgs({
    args: commandArgs,
    allowPositionals: false,
    allowNegative: true,
    options: {
      bundle: {
        type: 'string',
        multiple: true,
      },
      hasLargeFiles: {
        type: 'boolean',
      },
      skipBundlePackageJson: {
        type: 'boolean',
      },
      cjsOutDir: {
        type: 'string',
      },
      verbose: {
        type: 'boolean',
      },
      buildTypes: {
        type: 'boolean',
      },
      skipTsc: {
        type: 'boolean',
      },
      ignore: {
        type: 'string',
        multiple: true,
      },
      skipBabelRuntimeCheck: {
        type: 'boolean',
      },
      skipPackageJson: {
        type: 'boolean',
      },
      skipMainCheck: {
        type: 'boolean',
      },
      noCheck: {
        type: 'boolean',
      },
      copy: {
        type: 'string',
        multiple: true,
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  });

  if (values.help) {
    printHelp();
    return;
  }

  const bundle = normalizeRepeated(values.bundle);
  if (bundle) {
    const invalidBundle = bundle.find((value) => !buildCommand.validBundles.includes(value));
    if (invalidBundle) {
      throw new Error(
        `Unrecognized bundle "${invalidBundle}". Valid bundles: ${buildCommand.validBundles.join(', ')}.`,
      );
    }
  }

  await command.run({
    ...values,
    bundle: bundle ?? ['esm', 'cjs'],
    ignore: normalizeRepeated(values.ignore) ?? [],
    copy: normalizeRepeated(values.copy) ?? [],
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
