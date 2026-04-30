import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoDirectory = resolve(scriptDirectory, "..");

/**
 * @typedef {{
 *   filePath: string;
 *   expectedText: string;
 * }} ExpectedHtmlPage
 */

/**
 * @typedef {{
 *   filePath: string;
 *   expectedText: string;
 * }} ExpectedOutputFile
 */

/**
 * @typedef {{
 *   name: string;
 *   directory: string;
 *   outputDirectory: string;
 *   expectedHtmlPages: readonly ExpectedHtmlPage[];
 *   expectedOutputFiles?: readonly ExpectedOutputFile[];
 *   setup?: "static-site-sdk";
 * }} ExampleProject
 */

/**
 * Runs pinned example builds against the local OpenNav package.
 */
class ExampleBuildTestRunner {
  /**
   * @param {readonly ExampleProject[]} examples - Example projects to install,
   * build, and verify.
   */
  constructor(examples) {
    this.examples = examples;
  }

  /**
   * Builds OpenNav and verifies every configured example project.
   *
   * @returns {Promise<void>} Resolves after all example builds produce expected
   * static HTML output.
   */
  async run() {
    await this.buildOpenNavPackages();

    for (const example of this.examples) {
      await this.verifyExample(example);
    }
  }

  /**
   * Builds local OpenNav packages before fixture installs resolve them.
   *
   * @returns {Promise<void>} Resolves after package dist files are ready.
   */
  async buildOpenNavPackages() {
    await this.runCommand({
      command: "npm",
      args: ["run", "build", "--workspace", "@opennav-ai/engine"],
      cwd: repoDirectory,
      label: "build @opennav-ai/engine",
    });
    await this.runCommand({
      command: "npm",
      args: [
        "exec",
        "tsc",
        "--",
        "--build",
        "packages/engine/tsconfig.json",
        "--force",
        "--emitDeclarationOnly",
      ],
      cwd: repoDirectory,
      label: "refresh @opennav-ai/engine project references",
    });
    await this.runCommand({
      command: "npm",
      args: ["run", "build", "--workspace", "@opennav-ai/opennav"],
      cwd: repoDirectory,
      label: "build @opennav-ai/opennav",
    });
  }

  /**
   * Installs, builds, and checks one example project.
   *
   * @param {ExampleProject} example - Example project and expected output.
   * @returns {Promise<void>} Resolves after the example build is verified.
   */
  async verifyExample(example) {
    const exampleDirectory = join(repoDirectory, example.directory);
    const outputDirectory = join(exampleDirectory, example.outputDirectory);

    await rm(outputDirectory, { force: true, recursive: true });
    await this.setupExampleOutput(example);
    await this.runCommand({
      command: "npm",
      args: [
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--fund=false",
        "--cache",
        "../../.npm-cache",
      ],
      cwd: exampleDirectory,
      label: `${example.name} install`,
    });
    await this.runCommand({
      command: "npm",
      args: ["run", "build"],
      cwd: exampleDirectory,
      label: `${example.name} build`,
    });
    await this.assertHtmlOutput(example);
    await this.assertOutputFiles(example);
  }

  /**
   * Creates any ignored static output files a copyable example needs before its
   * package build runs.
   *
   * @param {ExampleProject} example - Example project and optional setup mode.
   * @returns {Promise<void>} Resolves after the example output is ready.
   */
  async setupExampleOutput(example) {
    if (example.setup !== "static-site-sdk") {
      return;
    }

    await this.writeExampleOutputFile(
      example,
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
    await this.writeExampleOutputFile(
      example,
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
    await this.writeExampleOutputFile(
      example,
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
    await this.writeExampleOutputFile(
      example,
      "dist/assets/logo.svg",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#111827"/></svg>\n',
    );
  }

  /**
   * Checks that an example build emitted the expected static HTML files.
   *
   * @param {ExampleProject} example - Example project and expected HTML pages.
   * @returns {Promise<void>} Resolves after every expected HTML page is found.
   */
  async assertHtmlOutput(example) {
    for (const page of example.expectedHtmlPages) {
      await this.assertHtmlPage(example, page);
    }
  }

  /**
   * Checks one expected static HTML page.
   *
   * @param {ExampleProject} example - Example project that owns the page.
   * @param {ExpectedHtmlPage} page - Expected HTML file and identifying text.
   * @returns {Promise<void>} Resolves after the expected page is found.
   */
  async assertHtmlPage(example, page) {
    const htmlFilePath = join(repoDirectory, example.directory, page.filePath);

    await access(htmlFilePath);

    const html = await readFile(htmlFilePath, "utf8");

    if (!html.includes(page.expectedText)) {
      throw new Error(
        `${example.name} did not emit expected HTML text in ${page.filePath}: ${page.expectedText}`,
      );
    }
  }

  /**
   * Checks optional generated output files for an example build.
   *
   * @param {ExampleProject} example - Example project and optional output files.
   * @returns {Promise<void>} Resolves after every expected output file is found.
   */
  async assertOutputFiles(example) {
    if (example.expectedOutputFiles === undefined) {
      return;
    }

    for (const outputFile of example.expectedOutputFiles) {
      await this.assertOutputFile(example, outputFile);
    }
  }

  /**
   * Checks one expected generated output file.
   *
   * @param {ExampleProject} example - Example project that owns the file.
   * @param {ExpectedOutputFile} outputFile - Expected file and identifying text.
   * @returns {Promise<void>} Resolves after the expected output file is found.
   */
  async assertOutputFile(example, outputFile) {
    const outputFilePath = join(
      repoDirectory,
      example.directory,
      outputFile.filePath,
    );

    await access(outputFilePath);

    const content = await readFile(outputFilePath, "utf8");

    if (!content.includes(outputFile.expectedText)) {
      throw new Error(
        `${example.name} did not emit expected output text in ${outputFile.filePath}: ${outputFile.expectedText}`,
      );
    }
  }

  /**
   * Writes one ignored fixture file used only by the example compatibility test.
   *
   * @param {ExampleProject} example - Example project that owns the file.
   * @param {string} filePath - Project-relative output path to write.
   * @param {string} content - Exact UTF-8 file content.
   * @returns {Promise<void>} Resolves after the file exists on disk.
   */
  async writeExampleOutputFile(example, filePath, content) {
    const outputFilePath = join(repoDirectory, example.directory, filePath);

    await mkdir(dirname(outputFilePath), { recursive: true });
    await writeFile(outputFilePath, content, "utf8");
  }

  /**
   * Runs one command and preserves useful output when it fails.
   *
   * @param {{
   *   command: string;
   *   args: readonly string[];
   *   cwd: string;
   *   label: string;
   * }} input - Command details and a human-readable label.
   * @returns {Promise<void>} Resolves after the command exits successfully.
   */
  async runCommand(input) {
    try {
      const { stderr, stdout } = await execFileAsync(
        input.command,
        input.args,
        {
          cwd: input.cwd,
          env: {
            ...process.env,
            NEXT_TELEMETRY_DISABLED: "1",
          },
        },
      );

      if (stdout.trim().length > 0) {
        console.log(stdout.trim());
      }

      if (stderr.trim().length > 0) {
        console.error(stderr.trim());
      }
    } catch (error) {
      throw new Error(`${input.label} failed`, { cause: error });
    }
  }
}

const runner = new ExampleBuildTestRunner([
  {
    name: "Static site SDK",
    directory: "examples/static-site-sdk",
    outputDirectory: "dist",
    setup: "static-site-sdk",
    expectedHtmlPages: [
      {
        filePath: "dist/index.html",
        expectedText: "Static SDK Home",
      },
      {
        filePath: "dist/docs/about.html",
        expectedText: "Static SDK About",
      },
      {
        filePath: "dist/guides/setup.html",
        expectedText: "Static SDK Setup",
      },
    ],
    expectedOutputFiles: [
      {
        filePath: "dist/llms.txt",
        expectedText: "OpenNav Static SDK Example",
      },
      {
        filePath: "dist/llms-full.txt",
        expectedText: "Static SDK Home",
      },
      {
        filePath: "dist/.well-known/opennav.json",
        expectedText: "https://static-sdk.example.com",
      },
    ],
  },
  {
    name: "Astro 6 static",
    directory: "examples/astro-6-static",
    outputDirectory: "dist",
    expectedHtmlPages: [
      {
        filePath: "dist/index.html",
        expectedText: "OpenNav Astro 6 Static Fixture",
      },
      {
        filePath: "dist/docs/index.html",
        expectedText: "OpenNav Astro 6 Docs Fixture",
      },
      {
        filePath: "dist/guides/setup/index.html",
        expectedText: "OpenNav Astro 6 Setup Fixture",
      },
    ],
  },
  {
    name: "Astro 5 static",
    directory: "examples/astro-5-static",
    outputDirectory: "dist",
    expectedHtmlPages: [
      {
        filePath: "dist/index.html",
        expectedText: "OpenNav Astro 5 Static Fixture",
      },
      {
        filePath: "dist/docs/index.html",
        expectedText: "OpenNav Astro 5 Docs Fixture",
      },
      {
        filePath: "dist/guides/setup/index.html",
        expectedText: "OpenNav Astro 5 Setup Fixture",
      },
    ],
  },
  {
    name: "Astro 4 static",
    directory: "examples/astro-4-static",
    outputDirectory: "dist",
    expectedHtmlPages: [
      {
        filePath: "dist/index.html",
        expectedText: "OpenNav Astro 4 Static Fixture",
      },
      {
        filePath: "dist/docs/index.html",
        expectedText: "OpenNav Astro 4 Docs Fixture",
      },
      {
        filePath: "dist/guides/setup/index.html",
        expectedText: "OpenNav Astro 4 Setup Fixture",
      },
    ],
  },
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
]);

await runner.run();

console.log(
  JSON.stringify(
    {
      ok: true,
      examples: [
        "static-site-sdk",
        "astro-6-static",
        "astro-5-static",
        "astro-4-static",
        "next-16-static",
        "next-15-static",
        "next-14-static",
      ],
    },
    null,
    2,
  ),
);
