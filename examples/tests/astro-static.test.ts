import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CloudflareHeadersExpectation } from "./helpers/cloudflare-headers-expectation.ts";
import { ExampleBuildTestRunner } from "./helpers/example-build-test-runner.ts";
import { ExampleOutputSnapshot } from "./helpers/example-output-snapshot.ts";
import { PackedOpenNavPackages } from "./helpers/packed-opennav-packages.ts";

interface AstroStaticExampleConfig {
  readonly name: string;
  readonly directory: string;
  readonly outputDirectory: string;
  readonly siteUrl: string;
}

class AstroStaticExample {
  private readonly baselineConfigFilePath = "astro.config.opennav-baseline.mjs";
  private readonly openNavConfigFilePath = "astro.config.ts";
  private readonly config: AstroStaticExampleConfig;
  private readonly runner: ExampleBuildTestRunner;

  /**
   * Stores the Astro example config and shared runner.
   *
   * @param config - Astro example paths and public site URL.
   * @param runner - Example command and filesystem helper.
   */
  public constructor(
    config: AstroStaticExampleConfig,
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
   * Runs Astro's static type checker against the example project.
   *
   * @returns Promise that resolves after the Astro config and pages typecheck.
   */
  public async runTypecheck(): Promise<void> {
    await this.runner.runTypecheck(this.config.directory, this.config.name);
  }

  /**
   * Reads the checked-in Astro config that installs `OpenNavAstro(...)`.
   *
   * @returns Exact UTF-8 content of `astro.config.ts`.
   */
  public async readOpenNavConfig(): Promise<string> {
    return await this.runner.readExampleFile(
      this.config.directory,
      this.openNavConfigFilePath,
    );
  }

  /**
   * Restores the checked-in Astro config after a temporary test edit.
   *
   * @param content - Exact Astro config content previously read from disk.
   * @returns Promise that resolves after `astro.config.ts` is restored.
   */
  public async restoreOpenNavConfig(content: string): Promise<void> {
    await this.runner.writeExampleFile(
      this.config.directory,
      this.openNavConfigFilePath,
      content,
    );
  }

  /**
   * Writes a temporary Astro config with Cloudflare Pages configured.
   *
   * @param content - Checked-in Astro config content to extend.
   * @returns Promise that resolves after the temporary config is written.
   */
  public async writeCloudflareOpenNavConfig(content: string): Promise<void> {
    const cloudflareContent = content.replace(
      '  mode: "static",\n});',
      '  mode: "static",\n  platform: "cloudflare-pages",\n});',
    );

    if (cloudflareContent === content) {
      throw new Error("Astro example OpenNav config shape changed.");
    }

    await this.runner.writeExampleFile(
      this.config.directory,
      this.openNavConfigFilePath,
      cloudflareContent,
    );
  }

  /**
   * Writes an Astro config that builds the same pages without OpenNav.
   *
   * @returns Promise that resolves after the baseline config exists.
   */
  public async writeBaselineConfig(): Promise<void> {
    await this.runner.writeExampleFile(
      this.config.directory,
      this.baselineConfigFilePath,
      `import { defineConfig } from "astro/config";

export default defineConfig({
  site: "${this.config.siteUrl}",
  output: "static",
  integrations: [],
});
`,
    );
  }

  /**
   * Removes the temporary baseline config file.
   *
   * @returns Promise that resolves after the baseline config is absent.
   */
  public async removeBaselineConfig(): Promise<void> {
    await this.runner.removeExampleFile(
      this.config.directory,
      this.baselineConfigFilePath,
    );
  }

  /**
   * Runs Astro with the OpenNav-free config.
   *
   * @returns Promise that resolves after baseline static files are emitted.
   */
  public async runBaselineBuild(): Promise<void> {
    await this.runner.cleanOutputDirectory(
      this.config.directory,
      this.config.outputDirectory,
    );
    await this.runner.runNpmScript(
      this.config.directory,
      this.config.name,
      "build",
      ["--", "--config", this.baselineConfigFilePath],
    );
  }

  /**
   * Runs Astro with the real example config and OpenNav integration.
   *
   * @returns Promise that resolves after OpenNav files and page links are
   * written.
   */
  public async runOpenNavBuild(): Promise<void> {
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
   * Reads the generated Cloudflare Pages `_headers` file.
   *
   * @returns Exact UTF-8 content of the output `_headers` file.
   */
  public async readHeadersFile(): Promise<string> {
    return await this.runner.readExampleFile(
      this.config.directory,
      join(this.config.outputDirectory, "_headers"),
    );
  }

  /**
   * Reads the current Astro output tree as an exact snapshot.
   *
   * @returns Output file paths and exact UTF-8 contents.
   */
  public async readOutputSnapshot(): Promise<
    readonly { readonly filePath: string; readonly content: string }[]
  > {
    return await new ExampleOutputSnapshot(
      join(
        this.runner.resolveExampleDirectory(this.config.directory),
        this.config.outputDirectory,
      ),
    ).read();
  }
}

describe("Astro static examples", (): void => {
  const repositoryDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const runner = new ExampleBuildTestRunner(repositoryDirectory);
  let packages: PackedOpenNavPackages | undefined;
  const cloudflareHeadersExpectation = new CloudflareHeadersExpectation();
  const astroSixStaticExample: AstroStaticExampleConfig = {
    name: "Astro 6 static",
    directory: "examples/astro-6-static",
    outputDirectory: "dist",
    siteUrl: "https://astro-6.example.com",
  };
  const examples: readonly AstroStaticExampleConfig[] = [
    astroSixStaticExample,
    {
      name: "Astro 5 static",
      directory: "examples/astro-5-static",
      outputDirectory: "dist",
      siteUrl: "https://astro-5.example.com",
    },
    {
      name: "Astro 4 static",
      directory: "examples/astro-4-static",
      outputDirectory: "dist",
      siteUrl: "https://astro-4.example.com",
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

      const example = new AstroStaticExample(config, runner);

      await example.install(packages);
      await example.runTypecheck();
      await example.writeBaselineConfig();

      try {
        await example.runBaselineBuild();

        expect(await example.readOutputSnapshot()).toMatchSnapshot(
          `${config.name} framework output before OpenNav build`,
        );

        await example.runOpenNavBuild();

        expect(await example.readOutputSnapshot()).toMatchSnapshot(
          `${config.name} OpenNav output`,
        );
      } finally {
        await example.removeBaselineConfig();
      }
    }, 600_000);
  }

  it("writes Cloudflare Pages headers through the packed Astro SDK", async (): Promise<void> => {
    if (packages === undefined) {
      throw new Error("Packed OpenNav packages were not created.");
    }

    const example = new AstroStaticExample(astroSixStaticExample, runner);

    await example.install(packages);

    const openNavConfig = await example.readOpenNavConfig();

    try {
      await example.writeCloudflareOpenNavConfig(openNavConfig);
      await example.runTypecheck();
      await example.runOpenNavBuild();

      expect(
        cloudflareHeadersExpectation.normalize(await example.readHeadersFile()),
      ).toEqual(
        cloudflareHeadersExpectation.expectedNormalizedContent({
          siteUrl: astroSixStaticExample.siteUrl,
          pages: [
            {
              route: "/",
              markdownPath: "index.md",
            },
            {
              route: "/docs/",
              markdownPath: "docs/index.md",
            },
            {
              route: "/guides/setup/",
              markdownPath: "guides/setup/index.md",
            },
          ],
        }),
      );
    } finally {
      await example.restoreOpenNavConfig(openNavConfig);
    }
  }, 600_000);
});
