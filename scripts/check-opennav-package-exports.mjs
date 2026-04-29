import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoDirectory = resolve(scriptDirectory, "..");
const engineDirectory = join(repoDirectory, "packages/engine");
const openNavDirectory = join(repoDirectory, "packages/opennav");
const rootNodeModulesDirectory = join(repoDirectory, "node_modules");
const npmCacheDirectory = join(repoDirectory, ".npm-cache");
const packageDependencies = [
  "js-tiktoken",
  "neverthrow",
  "parse5",
  "turndown",
  "turndown-plugin-gfm",
];

/**
 * @typedef {{
 *   consumerName: string;
 *   extractedPackageDirectory: string;
 *   packageJson: Record<string, unknown>;
 *   source: string;
 *   tsconfig: Record<string, unknown>;
 * }} TypeConsumerCheckInput
 */

const tempDirectory = await mkdtemp(join(tmpdir(), "opennav-package-exports-"));
let shouldCleanup = false;

try {
  const packedPackagePath = await packOpenNavPackage(tempDirectory);
  const extractedPackageDirectory = await extractPackedPackage(
    packedPackagePath,
    tempDirectory,
  );

  await checkTypeConsumer({
    consumerName: "esm-consumer",
    extractedPackageDirectory,
    packageJson: {
      name: "opennav-esm-type-consumer",
      private: true,
      type: "module",
    },
    tsconfig: {
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
        target: "ES2022",
        types: [],
      },
      include: ["index.ts"],
    },
    source: [
      'import { OpenNavConfig, OpenNavStaticSite } from "@opennav-ai/opennav";',
      'import { OpenNavAstro } from "@opennav-ai/opennav/astro";',
      'import { OpenNavNext } from "@opennav-ai/opennav/next";',
      'import type { EngineExecuteResult, OpenNavError } from "@opennav-ai/engine";',
      'import type { Result } from "neverthrow";',
      "",
      "const config = OpenNavConfig({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      "});",
      "",
      "const staticSite = new OpenNavStaticSite({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      '  outputDirectory: "dist",',
      "});",
      "",
      "const build: Promise<Result<EngineExecuteResult, OpenNavError>> =",
      "  staticSite.build({ dryRun: true });",
      "",
      "const astroIntegration = OpenNavAstro({",
      '  siteName: "Example Docs",',
      '  mode: "static",',
      "});",
      "",
      "const nextConfig = OpenNavNext({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      '  mode: "static",',
      '})({ output: "export" });',
      "",
      "void config;",
      "void build;",
      "void astroIntegration;",
      "void nextConfig;",
      "",
    ].join("\n"),
  });

  await checkCommonJsRuntimeConsumer({
    extractedPackageDirectory,
    source: [
      'const assert = require("node:assert/strict");',
      'const { OpenNavConfig, OpenNavStaticSite } = require("@opennav-ai/opennav");',
      'const { OpenNavAstro } = require("@opennav-ai/opennav/astro");',
      'const { OpenNavNext } = require("@opennav-ai/opennav/next");',
      "",
      "const config = OpenNavConfig({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      "});",
      "const staticSite = new OpenNavStaticSite({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      '  outputDirectory: "dist",',
      "});",
      "const astroIntegration = OpenNavAstro({",
      '  siteName: "Example Docs",',
      "});",
      "const nextConfig = OpenNavNext({",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      '})({ output: "export" });',
      "",
      "assert.equal(typeof OpenNavStaticSite, 'function');",
      "assert.deepEqual(config, {",
      '  siteName: "Example Docs",',
      '  siteUrl: "https://example.com",',
      "});",
      "assert.deepEqual(astroIntegration, {",
      '  name: "@opennav-ai/opennav/astro",',
      "  hooks: {},",
      "});",
      "assert.deepEqual(nextConfig, { output: 'export' });",
      "void staticSite;",
      "",
    ].join("\n"),
  });

  shouldCleanup = true;
  console.log(
    JSON.stringify(
      {
        ok: true,
        package: "@opennav-ai/opennav",
        checks: ["esm-types", "cjs-runtime"],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        tempDirectory,
        error: formatUnknownError(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  if (shouldCleanup) {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

/**
 * @param {{
 *   extractedPackageDirectory: string;
 *   source: string;
 * }} input
 * @returns {Promise<void>}
 */
async function checkCommonJsRuntimeConsumer(input) {
  const consumerDirectory = join(tempDirectory, "cjs-consumer");

  await prepareConsumer({
    consumerDirectory,
    extractedPackageDirectory: input.extractedPackageDirectory,
  });
  await writeJson(join(consumerDirectory, "package.json"), {
    name: "opennav-cjs-runtime-consumer",
    private: true,
    type: "commonjs",
  });
  await writeFile(join(consumerDirectory, "index.cjs"), input.source, "utf8");
  await execFileAsync(process.execPath, ["index.cjs"], {
    cwd: consumerDirectory,
  });
}

/**
 * @param {TypeConsumerCheckInput} input
 * @returns {Promise<void>}
 */
async function checkTypeConsumer(input) {
  const consumerDirectory = join(tempDirectory, input.consumerName);

  await prepareConsumer({
    consumerDirectory,
    extractedPackageDirectory: input.extractedPackageDirectory,
  });
  await writeJson(join(consumerDirectory, "package.json"), input.packageJson);
  await writeJson(join(consumerDirectory, "tsconfig.json"), input.tsconfig);
  await writeFile(join(consumerDirectory, "index.ts"), input.source, "utf8");
  await runTypeScript(consumerDirectory);
}

/**
 * @param {string} packedPackagePath
 * @param {string} parentDirectory
 * @returns {Promise<string>}
 */
async function extractPackedPackage(packedPackagePath, parentDirectory) {
  const extractDirectory = join(parentDirectory, "extracted");
  await mkdir(extractDirectory, { recursive: true });
  await execFileAsync("tar", [
    "-xzf",
    packedPackagePath,
    "-C",
    extractDirectory,
  ]);
  return join(extractDirectory, "package");
}

/**
 * @param {unknown} error
 * @returns {{ message: string; name: string; stderr?: unknown; stdout?: unknown }}
 */
function formatUnknownError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stderr: "stderr" in error ? error.stderr : undefined,
      stdout: "stdout" in error ? error.stdout : undefined,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}

/**
 * @param {string} destinationDirectory
 * @returns {Promise<string>}
 */
async function packOpenNavPackage(destinationDirectory) {
  const { stdout } = await execFileAsync(
    "npm",
    [
      "pack",
      "--json",
      "--pack-destination",
      destinationDirectory,
      "--cache",
      npmCacheDirectory,
    ],
    {
      cwd: openNavDirectory,
    },
  );
  const packRecords = JSON.parse(stdout);
  const [packRecord] = packRecords;

  return join(destinationDirectory, packRecord.filename);
}

/**
 * @param {{
 *   consumerDirectory: string;
 *   extractedPackageDirectory: string;
 * }} input
 * @returns {Promise<void>}
 */
async function prepareConsumer(input) {
  const consumerNodeModulesDirectory = join(
    input.consumerDirectory,
    "node_modules",
  );
  const consumerScopeDirectory = join(
    consumerNodeModulesDirectory,
    "@opennav-ai",
  );

  await mkdir(consumerScopeDirectory, { recursive: true });
  await cp(
    input.extractedPackageDirectory,
    join(consumerScopeDirectory, "opennav"),
    { recursive: true },
  );
  await cp(engineDirectory, join(consumerScopeDirectory, "engine"), {
    recursive: true,
  });
  await symlinkPackageDependencies(consumerNodeModulesDirectory);
}

/**
 * @param {string} consumerDirectory
 * @returns {Promise<void>}
 */
async function runTypeScript(consumerDirectory) {
  const tscPath = join(rootNodeModulesDirectory, "typescript/bin/tsc");
  await execFileAsync(
    process.execPath,
    [tscPath, "--project", "tsconfig.json", "--pretty", "false"],
    {
      cwd: consumerDirectory,
    },
  );
}

/**
 * @param {string} consumerNodeModulesDirectory
 * @returns {Promise<void>}
 */
async function symlinkPackageDependencies(consumerNodeModulesDirectory) {
  await mkdir(consumerNodeModulesDirectory, { recursive: true });

  for (const dependencyName of packageDependencies) {
    await symlink(
      join(rootNodeModulesDirectory, dependencyName),
      join(consumerNodeModulesDirectory, dependencyName),
      "dir",
    );
  }
}

/**
 * @param {string} filePath
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
