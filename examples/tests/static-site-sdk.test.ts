import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ExampleBuildTestRunner } from "./helpers/example-build-test-runner.ts";
import { ExampleOutputSnapshot } from "./helpers/example-output-snapshot.ts";
import { PackedOpenNavPackages } from "./helpers/packed-opennav-packages.ts";

class StaticSiteSdkExample {
  private readonly exampleDirectory = "examples/static-site-sdk";
  private readonly exampleName = "Static site SDK";
  private readonly outputDirectory = "dist";
  private readonly runner: ExampleBuildTestRunner;

  /**
   * Stores the shared runner used for static SDK example commands.
   *
   * @param runner - Example command and filesystem helper.
   */
  public constructor(runner: ExampleBuildTestRunner) {
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
      this.exampleDirectory,
      this.exampleName,
    );
    await this.runner.installPackedOpenNavPackages(
      this.exampleDirectory,
      this.exampleName,
      packages.openNavTarballPath,
    );
    await this.runner.assertPackedOpenNavInstall(
      this.exampleDirectory,
      this.exampleName,
    );
  }

  /**
   * Recreates the plain static output before OpenNav SDK behavior runs.
   *
   * @returns Promise that resolves after the baseline files are present.
   */
  public async writeBaselineOutput(): Promise<void> {
    await this.runner.cleanOutputDirectory(
      this.exampleDirectory,
      this.outputDirectory,
    );
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      "dist/index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <title>Static SDK Home</title>
    <meta
      name="description"
      content="Plain static site root page for the OpenNav SDK."
    />
  </head>
  <body>
    <main>
      <h1>Static SDK Home</h1>
      <p>Plain static HTML can call OpenNav after files are built.</p>
    </main>
  </body>
</html>
`,
    );
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      "dist/docs/about.html",
      `<!doctype html>
<html lang="en">
  <head>
    <title>Static SDK About</title>
    <meta
      name="description"
      content="A second plain static route for the OpenNav SDK."
    />
  </head>
  <body>
    <main>
      <h1>Static SDK About</h1>
      <p>This page proves the SDK discovers nested static HTML files.</p>
    </main>
  </body>
</html>
`,
    );
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      "dist/guides/setup.html",
      `<!doctype html>
<html lang="en">
  <head>
    <title>Static SDK Setup</title>
    <meta
      name="description"
      content="A nested plain static route for the OpenNav SDK."
    />
  </head>
  <body>
    <main>
      <h1>Static SDK Setup</h1>
      <p>This setup page proves the SDK discovers deep static HTML files.</p>
    </main>
  </body>
</html>
`,
    );
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      "dist/assets/logo.svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#111827"/></svg>\n',
    );
  }

  /**
   * Runs the example's OpenNav SDK build script.
   *
   * @returns Promise that resolves after OpenNav files and page links are
   * written.
   */
  public async runOpenNavBuild(): Promise<void> {
    await this.runner.runNpmScript(
      this.exampleDirectory,
      this.exampleName,
      "build",
    );
  }

  /**
   * Reads the current static output tree as an exact snapshot.
   *
   * @returns Output file paths and exact UTF-8 contents.
   */
  public async readOutputSnapshot(): Promise<
    readonly { readonly filePath: string; readonly content: string }[]
  > {
    return await new ExampleOutputSnapshot(
      join(
        this.runner.resolveExampleDirectory(this.exampleDirectory),
        this.outputDirectory,
      ),
    ).read();
  }
}

describe("static site SDK example", (): void => {
  const repositoryDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const runner = new ExampleBuildTestRunner(repositoryDirectory);
  const example = new StaticSiteSdkExample(runner);
  let packages: PackedOpenNavPackages | undefined;

  beforeAll(async (): Promise<void> => {
    packages = await PackedOpenNavPackages.create(runner);
  }, 600_000);

  afterAll(async (): Promise<void> => {
    await packages?.dispose();
  });

  it("keeps the plain static baseline stable before the SDK modifies it", async (): Promise<void> => {
    if (packages === undefined) {
      throw new Error("Packed OpenNav packages were not created.");
    }

    await example.install(packages);
    await example.writeBaselineOutput();

    expect(await example.readOutputSnapshot()).toMatchSnapshot(
      "plain static output before SDK build",
    );

    await example.runOpenNavBuild();

    expect(await example.readOutputSnapshot()).toMatchSnapshot(
      "OpenNav static SDK output",
    );
  }, 600_000);
});
