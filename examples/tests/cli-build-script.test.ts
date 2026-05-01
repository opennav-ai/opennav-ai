import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CloudflareHeadersExpectation } from "./helpers/cloudflare-headers-expectation.ts";
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
   * Runs only the example's static file generation step.
   *
   * @returns Promise that resolves after plain static files are written.
   */
  public async runStaticBuild(): Promise<void> {
    await this.runner.runNpmScript(
      this.exampleDirectory,
      this.exampleName,
      "build:static",
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
   * Runs the packed OpenNav CLI with Cloudflare Pages platform settings.
   *
   * @returns Promise that resolves after OpenNav writes Cloudflare headers.
   */
  public async runCloudflareOpenNavBuild(): Promise<void> {
    await this.runner.runCommand(
      "npm",
      [
        "exec",
        "--",
        "opennav",
        "build",
        "--static",
        "--output",
        this.outputDirectory,
        "--site-url",
        "https://cli.example.com",
        "--site-name",
        "CLI Example Docs",
        "--platform",
        "cloudflare-pages",
      ],
      this.runner.resolveExampleDirectory(this.exampleDirectory),
      `${this.exampleName} Cloudflare OpenNav CLI build`,
    );
  }

  /**
   * Runs the packed OpenNav CLI with layout stripping enabled.
   *
   * @returns Promise that resolves after OpenNav writes stripped Markdown files.
   */
  public async runStripLayoutOpenNavBuild(): Promise<void> {
    await this.runner.runCommand(
      "npm",
      [
        "exec",
        "--",
        "opennav",
        "build",
        "--static",
        "--output",
        this.outputDirectory,
        "--site-url",
        "https://cli.example.com",
        "--site-name",
        "CLI Example Docs",
        "--strip-layout",
      ],
      this.runner.resolveExampleDirectory(this.exampleDirectory),
      `${this.exampleName} strip-layout OpenNav CLI build`,
    );
  }

  /**
   * Writes a small static output folder with repeated layout text around content.
   *
   * @returns Promise that resolves after the layout-heavy HTML pages exist.
   */
  public async writeLayoutHeavyStaticOutput(): Promise<void> {
    await this.cleanOutput();
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      join(this.outputDirectory, "index.html"),
      `<!doctype html>
<html lang="en">
  <head>
    <title>CLI Example Home</title>
    <meta
      name="description"
      content="Plain static site root page for the OpenNav CLI."
    />
  </head>
  <body>
    <a href="#content">Skip to content</a>
    <header><p>Repeated header navigation</p></header>
    <nav><p>Repeated primary navigation</p></nav>
    <main id="content">
      <h1>CLI Example Home</h1>
      <p>Plain static HTML can run OpenNav from an npm build script.</p>
    </main>
    <aside><p>Repeated sidebar navigation</p></aside>
    <footer><p>Repeated footer navigation</p></footer>
  </body>
</html>
`,
    );
    await this.runner.writeExampleFile(
      this.exampleDirectory,
      join(this.outputDirectory, "docs/about.html"),
      `<!doctype html>
<html lang="en">
  <head>
    <title>CLI Example About</title>
    <meta
      name="description"
      content="A second plain static route for the OpenNav CLI."
    />
  </head>
  <body>
    <header><p>Repeated header navigation</p></header>
    <nav><p>Repeated primary navigation</p></nav>
    <main>
      <h1>CLI Example About</h1>
      <p>This page proves the CLI discovers nested static HTML files.</p>
    </main>
    <aside><p>Repeated sidebar navigation</p></aside>
    <footer><p>Repeated footer navigation</p></footer>
  </body>
</html>
`,
    );
  }

  /**
   * Reads the generated Cloudflare Pages `_headers` file.
   *
   * @returns Exact UTF-8 content of `dist/_headers`.
   */
  public async readHeadersFile(): Promise<string> {
    return await this.runner.readExampleFile(
      this.exampleDirectory,
      join(this.outputDirectory, "_headers"),
    );
  }

  /**
   * Reads one generated output file from the CLI example `dist` folder.
   *
   * @param outputFilePath - Output-directory-relative file path to read.
   * @returns Exact UTF-8 content of the generated file.
   */
  public async readGeneratedFile(outputFilePath: string): Promise<string> {
    return await this.runner.readExampleFile(
      this.exampleDirectory,
      join(this.outputDirectory, outputFilePath),
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
  const cloudflareHeadersExpectation = new CloudflareHeadersExpectation();
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

  it("writes Cloudflare Pages headers through the packed CLI", async (): Promise<void> => {
    if (packages === undefined) {
      throw new Error("Packed OpenNav packages were not created.");
    }

    await example.install(packages);
    await example.runTypecheck();
    await example.cleanOutput();
    await example.runStaticBuild();
    await example.runCloudflareOpenNavBuild();

    expect(
      cloudflareHeadersExpectation.normalize(await example.readHeadersFile()),
    ).toEqual(
      cloudflareHeadersExpectation.expectedNormalizedContent({
        siteUrl: "https://cli.example.com",
        pages: [
          {
            route: "/",
            markdownPath: "index.md",
          },
          {
            route: "/docs/about",
            markdownPath: "docs/about.md",
          },
        ],
      }),
    );
  }, 600_000);

  it("strips layout content through the packed CLI", async (): Promise<void> => {
    if (packages === undefined) {
      throw new Error("Packed OpenNav packages were not created.");
    }

    await example.install(packages);
    await example.runTypecheck();
    await example.writeLayoutHeavyStaticOutput();
    await example.runStripLayoutOpenNavBuild();

    expect({
      indexMarkdown: normalizeBuildFingerprint(
        await example.readGeneratedFile("index.md"),
      ),
      llmsFullTxt: normalizeBuildFingerprint(
        await example.readGeneratedFile("llms-full.txt"),
      ),
    }).toEqual({
      indexMarkdown:
        '# CLI Example Home\n\nPlain static HTML can run OpenNav from an npm build script.\n\n---\n\nSite index: [llms.txt](https://cli.example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:[opennav-build-fingerprint]" manifest="/.well-known/opennav.json" -->\n',
      llmsFullTxt:
        '# CLI Example Docs\n\n## Root\n\n### CLI Example Home\n\nURL: https://cli.example.com/index.md\n\nPlain static site root page for the OpenNav CLI.\n\n# CLI Example Home\n\nPlain static HTML can run OpenNav from an npm build script.\n\n---\n\n## Docs\n\n### CLI Example About\n\nURL: https://cli.example.com/docs/about.md\n\nA second plain static route for the OpenNav CLI.\n\n# CLI Example About\n\nThis page proves the CLI discovers nested static HTML files.\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:[opennav-build-fingerprint]" manifest="/.well-known/opennav.json" -->\n',
    });
  }, 600_000);
});

function normalizeBuildFingerprint(content: string): string {
  return content.replace(
    /sha256:[0-9a-f]{12}/gu,
    "sha256:[opennav-build-fingerprint]",
  );
}
