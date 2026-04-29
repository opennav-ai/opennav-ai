import { execFile } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
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
 *   name: string;
 *   directory: string;
 *   outputDirectory: string;
 *   expectedHtmlPages: readonly ExpectedHtmlPage[];
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
    await this.buildOpenNavPackage();

    for (const example of this.examples) {
      await this.verifyExample(example);
    }
  }

  /**
   * Builds the local public OpenNav package before fixture installs resolve it.
   *
   * @returns {Promise<void>} Resolves after the package dist files are ready.
   */
  async buildOpenNavPackage() {
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
