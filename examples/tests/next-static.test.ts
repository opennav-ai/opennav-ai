import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ExampleBuildTestRunner } from "./helpers/example-build-test-runner.ts";
import { ExampleOutputSnapshot } from "./helpers/example-output-snapshot.ts";
import { PackedOpenNavPackages } from "./helpers/packed-opennav-packages.ts";

interface NextStaticExampleConfig {
  readonly name: string;
  readonly directory: string;
  readonly outputDirectory: string;
  readonly expectedOpenNavOutputFilePaths: readonly string[];
  readonly baselineConfigContent: string;
}

interface NextStaticOutputFile {
  readonly filePath: string;
  readonly content: string;
}

const standardOpenNavOutputFilePaths: readonly string[] = [
  ".well-known/llms-full.txt",
  ".well-known/llms.txt",
  ".well-known/opennav.json",
  "docs.md",
  "guides/setup.md",
  "index.md",
  "llms-full.txt",
  "llms.txt",
];

class NextStaticExample {
  private readonly config: NextStaticExampleConfig;
  private readonly runner: ExampleBuildTestRunner;

  /**
   * Stores the Next example config and shared runner.
   *
   * @param config - Next example paths, site metadata, and baseline config.
   * @param runner - Example command and filesystem helper.
   */
  public constructor(
    config: NextStaticExampleConfig,
    runner: ExampleBuildTestRunner,
  ) {
    this.config = config;
    this.runner = runner;
  }

  /**
   * Installs the example's dependencies from its lockfile and local tarballs.
   *
   * @param packages - Packed OpenNav package tarballs used by the example.
   * @returns Promise that resolves after dependencies are ready.
   */
  public async install(packages: PackedOpenNavPackages): Promise<void> {
    await this.runner.installExampleDependencies(
      this.config.directory,
      this.config.name,
    );
    await this.runner.installPackedOpenNavPackages(
      this.config.directory,
      this.config.name,
      packages.openNavTarballPath,
    );
    await this.runner.assertPackedOpenNavInstall(
      this.config.directory,
      this.config.name,
    );
  }

  /**
   * Reads the checked-in Next config that wraps `OpenNavNext(...)`.
   *
   * @returns Exact UTF-8 contents of `next.config.mjs`.
   */
  public async readOpenNavConfig(): Promise<string> {
    return await this.runner.readExampleFile(
      this.config.directory,
      "next.config.mjs",
    );
  }

  /**
   * Writes the OpenNav-free Next config used for the framework baseline build.
   *
   * @returns Promise that resolves after `next.config.mjs` contains the
   * baseline config.
   */
  public async writeBaselineConfig(): Promise<void> {
    await this.runner.writeExampleFile(
      this.config.directory,
      "next.config.mjs",
      this.config.baselineConfigContent,
    );
  }

  /**
   * Restores the checked-in Next config that wraps `OpenNavNext(...)`.
   *
   * @param content - Exact config content previously read from disk.
   * @returns Promise that resolves after `next.config.mjs` is restored.
   */
  public async restoreOpenNavConfig(content: string): Promise<void> {
    await this.runner.writeExampleFile(
      this.config.directory,
      "next.config.mjs",
      content,
    );
  }

  /**
   * Runs Next with the current `next.config.mjs`.
   *
   * @returns Promise that resolves after static files are emitted.
   */
  public async runBuild(): Promise<void> {
    await this.runner.cleanOutputDirectory(
      this.config.directory,
      this.config.outputDirectory,
    );
    await this.runner.runNpmScript(
      this.config.directory,
      this.config.name,
      "build",
    );
  }

  /**
   * Reads and normalizes the current Next output tree for snapshot comparison.
   *
   * @returns Output file paths and normalized UTF-8 contents.
   */
  public async readNormalizedOutputSnapshot(): Promise<
    readonly NextStaticOutputFile[]
  > {
    const files = await new ExampleOutputSnapshot(
      join(
        this.runner.resolveExampleDirectory(this.config.directory),
        this.config.outputDirectory,
      ),
    ).read();
    const normalizer = new NextStaticOutputNormalizer(files);

    return normalizer.normalize();
  }
}

class NextStaticOutputNormalizer {
  private readonly files: readonly NextStaticOutputFile[];
  private readonly replacements: readonly {
    readonly pattern: RegExp;
    readonly replacement: string;
  }[];

  /**
   * Stores raw Next output files and prepares deterministic replacement rules.
   *
   * @param files - Output file paths and exact UTF-8 contents from `out`.
   */
  public constructor(files: readonly NextStaticOutputFile[]) {
    this.files = files;
    this.replacements = this.createReplacements(files);
  }

  /**
   * Normalizes generated Next IDs, chunk filenames, and chunk contents.
   *
   * @returns Output files with deterministic paths and contents.
   */
  public normalize(): readonly NextStaticOutputFile[] {
    return this.files
      .map((file: NextStaticOutputFile): NextStaticOutputFile => {
        const filePath = this.normalizeText(file.filePath);

        return {
          filePath,
          content: this.normalizeContent(filePath, file.content),
        };
      })
      .sort(
        (first: NextStaticOutputFile, second: NextStaticOutputFile): number =>
          first.filePath.localeCompare(second.filePath),
      );
  }

  private createReplacements(
    files: readonly NextStaticOutputFile[],
  ): readonly { readonly pattern: RegExp; readonly replacement: string }[] {
    const replacements: {
      readonly pattern: RegExp;
      readonly replacement: string;
    }[] = [];
    const chunkFilePaths = files
      .map((file: NextStaticOutputFile): string => file.filePath)
      .filter((filePath: string): boolean =>
        filePath.startsWith("_next/static/chunks/"),
      );

    for (const [index, filePath] of chunkFilePaths.entries()) {
      const placeholder = `[next-chunk-${String(index + 1).padStart(2, "0")}].js`;
      const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);

      replacements.push({
        pattern: new RegExp(this.escapeRegExp(fileName), "gu"),
        replacement: placeholder,
      });
    }

    replacements.push({
      pattern:
        /_next\/static\/[^/]+\/(_buildManifest|_clientMiddlewareManifest|_ssgManifest)\.js/gu,
      replacement: "_next/static/[next-build-id]/$1.js",
    });

    replacements.push({
      pattern:
        /\/_next\/static\/[^/]+\/(_buildManifest|_clientMiddlewareManifest|_ssgManifest)\.js/gu,
      replacement: "/_next/static/[next-build-id]/$1.js",
    });

    replacements.push({
      pattern: /"buildId":"[^"]+"/gu,
      replacement: '"buildId":"[next-build-id]"',
    });

    replacements.push({
      pattern: /"b":"[^"]+"/gu,
      replacement: '"b":"[next-build-id]"',
    });

    replacements.push({
      pattern: /buildId\\":\\"[^\\"]+\\"/gu,
      replacement: 'buildId\\\\":\\\\"[next-build-id]\\\\"',
    });

    replacements.push({
      pattern: /b\\":\\"[^\\"]+\\"/gu,
      replacement: 'b\\\\":\\\\"[next-build-id]\\\\"',
    });

    replacements.push({
      pattern: /0:\["[^"]+",/gu,
      replacement: '0:["[next-build-id]",',
    });

    replacements.push({
      pattern: /<!DOCTYPE html><!--[^>]+-->/gu,
      replacement: "<!DOCTYPE html><!--[next-build-id]-->",
    });

    replacements.push({
      pattern: /sha256:[0-9a-f]{12}/gu,
      replacement: "sha256:[opennav-build-fingerprint]",
    });

    return replacements;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }

  private normalizeContent(filePath: string, content: string): string {
    if (filePath.startsWith("_next/static/chunks/")) {
      return "[normalized Next JavaScript chunk]\n";
    }

    return this.normalizeText(content);
  }

  private normalizeText(value: string): string {
    let normalizedValue = value;

    for (const replacement of this.replacements) {
      normalizedValue = normalizedValue.replace(
        replacement.pattern,
        replacement.replacement,
      );
    }

    return normalizedValue;
  }
}

describe("Next static examples", (): void => {
  const repositoryDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const runner = new ExampleBuildTestRunner(repositoryDirectory);
  let packages: PackedOpenNavPackages | undefined;
  const examples: readonly NextStaticExampleConfig[] = [
    {
      name: "Next 16 static",
      directory: "examples/next-16-static",
      outputDirectory: "out",
      expectedOpenNavOutputFilePaths: [
        "_not-found.md",
        ...standardOpenNavOutputFilePaths.slice(0, 3),
        ...standardOpenNavOutputFilePaths.slice(3),
      ],
      baselineConfigContent: `import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  turbopack: {
    root: fixtureDirectory,
  },
};

export default nextConfig;
`,
    },
    {
      name: "Next 15 static",
      directory: "examples/next-15-static",
      outputDirectory: "out",
      expectedOpenNavOutputFilePaths: standardOpenNavOutputFilePaths,
      baselineConfigContent: `import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  outputFileTracingRoot: exampleDirectory,
};

export default nextConfig;
`,
    },
    {
      name: "Next 14 static",
      directory: "examples/next-14-static",
      outputDirectory: "out",
      expectedOpenNavOutputFilePaths: standardOpenNavOutputFilePaths,
      baselineConfigContent: `const nextConfig = {
  output: "export",
};

export default nextConfig;
`,
    },
  ];

  beforeAll(async (): Promise<void> => {
    packages = await PackedOpenNavPackages.create(runner);
  }, 600_000);

  afterAll(async (): Promise<void> => {
    await packages?.dispose();
  });

  for (const config of examples) {
    it(`${config.name} keeps framework output stable before OpenNav modifies it`, async (): Promise<void> => {
      if (packages === undefined) {
        throw new Error("Packed OpenNav packages were not created.");
      }

      const example = new NextStaticExample(config, runner);

      await example.install(packages);

      const openNavConfig = await example.readOpenNavConfig();

      try {
        await example.writeBaselineConfig();
        await example.runBuild();

        const baselineSnapshot = await example.readNormalizedOutputSnapshot();

        expect(filterOpenNavOutputFilePaths(baselineSnapshot)).toEqual([]);
        expect(baselineSnapshot).toMatchSnapshot(
          `${config.name} framework output before OpenNav build`,
        );

        await example.restoreOpenNavConfig(openNavConfig);
        await example.runBuild();

        const openNavSnapshot = await example.readNormalizedOutputSnapshot();

        expect(filterOpenNavOutputFilePaths(openNavSnapshot)).toEqual(
          config.expectedOpenNavOutputFilePaths,
        );
        expect(openNavSnapshot).toMatchSnapshot(
          `${config.name} OpenNav output`,
        );
      } finally {
        await example.restoreOpenNavConfig(openNavConfig);
      }
    }, 600_000);
  }
});

function filterOpenNavOutputFilePaths(
  files: readonly NextStaticOutputFile[],
): readonly string[] {
  return files
    .map((file: NextStaticOutputFile): string => file.filePath)
    .filter((filePath: string): boolean => isOpenNavOutputFilePath(filePath));
}

function isOpenNavOutputFilePath(filePath: string): boolean {
  return (
    filePath.endsWith(".md") ||
    filePath === "llms.txt" ||
    filePath === "llms-full.txt" ||
    filePath === ".well-known/llms.txt" ||
    filePath === ".well-known/llms-full.txt" ||
    filePath === ".well-known/opennav.json"
  );
}
