import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ExampleBuildTestRunner } from "./helpers/example-build-test-runner.ts";
import { PackedOpenNavPackages } from "./helpers/packed-opennav-packages.ts";

interface ExpectedHtmlPage {
  readonly filePath: string;
  readonly expectedText: string;
}

interface NextStaticExampleConfig {
  readonly name: string;
  readonly directory: string;
  readonly outputDirectory: string;
  readonly expectedHtmlPages: readonly ExpectedHtmlPage[];
}

class NextStaticLegacyRunner {
  private readonly examples: readonly NextStaticExampleConfig[];
  private readonly runner: ExampleBuildTestRunner;

  /**
   * Stores the Next examples that still use legacy compatibility checks.
   *
   * @param runner - Example command and filesystem helper.
   * @param examples - Next example configs to build and verify.
   */
  public constructor(
    runner: ExampleBuildTestRunner,
    examples: readonly NextStaticExampleConfig[],
  ) {
    this.runner = runner;
    this.examples = examples;
  }

  /**
   * Builds local OpenNav packages and verifies the current Next examples.
   *
   * @returns Promise that resolves after all Next static examples pass their
   * legacy output checks.
   */
  public async run(): Promise<void> {
    const packages = await PackedOpenNavPackages.create(this.runner);

    try {
      for (const example of this.examples) {
        await this.verifyExample(example, packages);
      }
    } finally {
      await packages.dispose();
    }
  }

  private async verifyExample(
    example: NextStaticExampleConfig,
    packages: PackedOpenNavPackages,
  ): Promise<void> {
    await this.runner.cleanOutputDirectory(
      example.directory,
      example.outputDirectory,
    );
    await this.runner.installExampleDependencies(
      example.directory,
      example.name,
    );
    await this.runner.installPackedOpenNavPackages(
      example.directory,
      example.name,
      packages.engineTarballPath,
      packages.openNavTarballPath,
    );
    await this.runner.assertPackedOpenNavInstall(
      example.directory,
      example.name,
    );
    await this.runner.runNpmScript(example.directory, example.name, "build");
    await this.assertHtmlOutput(example);
  }

  private async assertHtmlOutput(
    example: NextStaticExampleConfig,
  ): Promise<void> {
    for (const page of example.expectedHtmlPages) {
      await this.assertHtmlPage(example, page);
    }
  }

  private async assertHtmlPage(
    example: NextStaticExampleConfig,
    page: ExpectedHtmlPage,
  ): Promise<void> {
    const htmlFilePath = join(
      this.runner.repositoryDirectory,
      example.directory,
      page.filePath,
    );

    await access(htmlFilePath);

    const html = await readFile(htmlFilePath, "utf8");

    if (!html.includes(page.expectedText)) {
      throw new Error(
        `${example.name} did not emit expected HTML text in ${page.filePath}: ${page.expectedText}`,
      );
    }
  }
}

const repositoryDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const runner = new NextStaticLegacyRunner(
  new ExampleBuildTestRunner(repositoryDirectory),
  [
    {
      name: "Next 16 static",
      directory: "examples/next-16-static",
      outputDirectory: "out",
      expectedHtmlPages: [
        {
          filePath: "out/index.html",
          expectedText: "OpenNav Next 16 Static Fixture",
        },
        {
          filePath: "out/docs.html",
          expectedText: "OpenNav Next 16 Docs Fixture",
        },
        {
          filePath: "out/guides/setup.html",
          expectedText: "OpenNav Next 16 Setup Fixture",
        },
      ],
    },
    {
      name: "Next 15 static",
      directory: "examples/next-15-static",
      outputDirectory: "out",
      expectedHtmlPages: [
        {
          filePath: "out/index.html",
          expectedText: "OpenNav Next 15 Static Fixture",
        },
        {
          filePath: "out/docs.html",
          expectedText: "OpenNav Next 15 Docs Fixture",
        },
        {
          filePath: "out/guides/setup.html",
          expectedText: "OpenNav Next 15 Setup Fixture",
        },
      ],
    },
    {
      name: "Next 14 static",
      directory: "examples/next-14-static",
      outputDirectory: "out",
      expectedHtmlPages: [
        {
          filePath: "out/index.html",
          expectedText: "OpenNav Next 14 Static Fixture",
        },
        {
          filePath: "out/docs.html",
          expectedText: "OpenNav Next 14 Docs Fixture",
        },
        {
          filePath: "out/guides/setup.html",
          expectedText: "OpenNav Next 14 Setup Fixture",
        },
      ],
    },
  ],
);

await runner.run();

console.log(
  JSON.stringify(
    {
      ok: true,
      examples: ["next-16-static", "next-15-static", "next-14-static"],
    },
    null,
    2,
  ),
);
