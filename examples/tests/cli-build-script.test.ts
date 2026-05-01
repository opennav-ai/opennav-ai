import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ExampleBuildTestRunner } from "./helpers/example-build-test-runner.ts";
import { ExampleOutputSnapshot } from "./helpers/example-output-snapshot.ts";
import { PackedOpenNavPackages } from "./helpers/packed-opennav-packages.ts";

class CliBuildScriptExample {
  private readonly exampleDirectory = "examples/cli-build-script";
  private readonly exampleName = "CLI build-script";
  private readonly outputDirectory = "dist";
  private readonly runner: ExampleBuildTestRunner;

  /**
   * Stores the shared runner used for CLI example commands.
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
   * Runs TypeScript against the CLI example build script.
   *
   * @returns Promise that resolves after the script source typechecks.
   */
  public async runTypecheck(): Promise<void> {
    await this.runner.runTypecheck(this.exampleDirectory, this.exampleName);
  }

  /**
   * Removes any previous static output before the example build runs.
   *
   * @returns Promise that resolves after the output directory is absent.
   */
  public async cleanOutput(): Promise<void> {
    await this.runner.cleanOutputDirectory(
      this.exampleDirectory,
      this.outputDirectory,
    );
  }

  /**
   * Runs the example's full build script through the OpenNav CLI.
   *
   * @returns Promise that resolves after static and OpenNav files are written.
   */
  public async runBuild(): Promise<void> {
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

describe("CLI build-script example", (): void => {
  const repositoryDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const runner = new ExampleBuildTestRunner(repositoryDirectory);
  const example = new CliBuildScriptExample(runner);
  let packages: PackedOpenNavPackages | undefined;

  beforeAll(async (): Promise<void> => {
    packages = await PackedOpenNavPackages.create(runner);
  }, 600_000);

  afterAll(async (): Promise<void> => {
    await packages?.dispose();
  });

  it("writes OpenNav files through the package build script", async (): Promise<void> => {
    if (packages === undefined) {
      throw new Error("Packed OpenNav packages were not created.");
    }

    await example.install(packages);
    await example.runTypecheck();
    await example.cleanOutput();
    await example.runBuild();

    expect(await example.readOutputSnapshot()).toMatchSnapshot(
      "CLI build-script OpenNav output",
    );
  }, 600_000);
});
