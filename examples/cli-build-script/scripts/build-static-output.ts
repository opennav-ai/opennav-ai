import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Creates the static output files consumed by the CLI example.
 */
class StaticOutputBuilder {
  private readonly outputDirectory: string;

  /**
   * Stores the static output directory for this example build.
   *
   * @param outputDirectory - Absolute path to the example-owned `dist` folder.
   */
  public constructor(outputDirectory: string) {
    this.outputDirectory = outputDirectory;
  }

  /**
   * Recreates the output directory with plain static files.
   *
   * @returns Promise that resolves after the example output exists.
   */
  public async build(): Promise<void> {
    await rm(this.outputDirectory, { force: true, recursive: true });
    await this.writeOutputFile(
      "index.html",
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
    <main>
      <h1>CLI Example Home</h1>
      <p>Plain static HTML can run OpenNav from an npm build script.</p>
    </main>
  </body>
</html>
`,
    );
    await this.writeOutputFile(
      "docs/about.html",
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
    <main>
      <h1>CLI Example About</h1>
      <p>This page proves the CLI discovers nested static HTML files.</p>
    </main>
  </body>
</html>
`,
    );
    await this.writeOutputFile(
      "assets/logo.svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#111827"/></svg>\n',
    );
  }

  private async writeOutputFile(
    outputFilePath: string,
    content: string,
  ): Promise<void> {
    const absoluteFilePath = join(this.outputDirectory, outputFilePath);

    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, content, "utf8");
  }
}

const exampleDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

await new StaticOutputBuilder(join(exampleDirectory, "dist")).build();
