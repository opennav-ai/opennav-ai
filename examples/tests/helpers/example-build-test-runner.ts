import { execFile } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Runs package manager commands and small filesystem setup steps for example
 * projects.
 */
export class ExampleBuildTestRunner {
  private readonly repositoryDirectoryValue: string;

  /**
   * Stores the repository root used for example project commands.
   *
   * @param repositoryDirectory - Absolute path to the OpenNav workspace root.
   */
  public constructor(repositoryDirectory: string) {
    this.repositoryDirectoryValue = repositoryDirectory;
  }

  /**
   * Returns the absolute repository root used as the command working tree.
   *
   * @returns Absolute path to the OpenNav workspace root.
   */
  public get repositoryDirectory(): string {
    return this.repositoryDirectoryValue;
  }

  /**
   * Converts an example-owned relative path to an absolute path.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @returns Absolute path to the example project directory.
   */
  public resolveExampleDirectory(exampleDirectory: string): string {
    return join(this.repositoryDirectoryValue, exampleDirectory);
  }

  /**
   * Removes the built output directory for one example project.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param outputDirectory - Example-relative output directory such as `dist`
   * or `out`.
   * @returns Promise that resolves after the output directory is absent.
   */
  public async cleanOutputDirectory(
    exampleDirectory: string,
    outputDirectory: string,
  ): Promise<void> {
    await rm(
      join(this.resolveExampleDirectory(exampleDirectory), outputDirectory),
      {
        force: true,
        recursive: true,
      },
    );
  }

  /**
   * Restores the pinned npm dependencies for one example project.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param exampleName - Human-readable example name used in command errors.
   * @returns Promise that resolves after `node_modules` matches the lockfile.
   */
  public async installExampleDependencies(
    exampleDirectory: string,
    exampleName: string,
  ): Promise<void> {
    await this.runCommand(
      "npm",
      [
        "ci",
        "--ignore-scripts",
        "--no-audit",
        "--fund=false",
        "--fetch-retries=0",
        "--cache",
        "../../.npm-cache",
      ],
      this.resolveExampleDirectory(exampleDirectory),
      `${exampleName} install`,
    );
  }

  /**
   * Installs packed local OpenNav packages into an example project.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param exampleName - Human-readable example name used in command errors.
   * @param engineTarballPath - Absolute path to the packed engine package.
   * @param openNavTarballPath - Absolute path to the packed OpenNav package.
   * @returns Promise that resolves after both tarballs are installed.
   */
  public async installPackedOpenNavPackages(
    exampleDirectory: string,
    exampleName: string,
    engineTarballPath: string,
    openNavTarballPath: string,
  ): Promise<void> {
    await this.runCommand(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--fund=false",
        "--offline",
        "--package-lock=false",
        "--no-save",
        "--fetch-retries=0",
        "--cache",
        "../../.npm-cache",
        engineTarballPath,
        openNavTarballPath,
      ],
      this.resolveExampleDirectory(exampleDirectory),
      `${exampleName} install packed OpenNav packages`,
    );
  }

  /**
   * Fails if an example resolves OpenNav packages through workspace symlinks.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param exampleName - Human-readable example name used in command errors.
   * @returns Promise that resolves after both packed package installs are
   * verified.
   */
  public async assertPackedOpenNavInstall(
    exampleDirectory: string,
    exampleName: string,
  ): Promise<void> {
    await this.assertPackedPackageInstall(
      exampleDirectory,
      exampleName,
      "node_modules/@opennav-ai/engine",
    );
    await this.assertPackedPackageInstall(
      exampleDirectory,
      exampleName,
      "node_modules/@opennav-ai/opennav",
    );
  }

  /**
   * Runs an npm script inside an example project.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param exampleName - Human-readable example name used in command errors.
   * @param scriptName - Name of the npm script to run.
   * @param scriptArguments - Extra arguments passed after the npm script name.
   * @returns Promise that resolves after the script exits successfully.
   */
  public async runNpmScript(
    exampleDirectory: string,
    exampleName: string,
    scriptName: string,
    scriptArguments: readonly string[] = [],
  ): Promise<void> {
    await this.runCommand(
      "npm",
      ["run", scriptName, ...scriptArguments],
      this.resolveExampleDirectory(exampleDirectory),
      `${exampleName} ${scriptName}`,
    );
  }

  /**
   * Writes one example project file used by a regression test setup step.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param filePath - Example-relative file path to write.
   * @param content - Exact UTF-8 file contents.
   * @returns Promise that resolves after the file exists on disk.
   */
  public async writeExampleFile(
    exampleDirectory: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    const outputFilePath = join(
      this.resolveExampleDirectory(exampleDirectory),
      filePath,
    );

    await mkdir(dirname(outputFilePath), { recursive: true });
    await writeFile(outputFilePath, content, "utf8");
  }

  /**
   * Removes one example project file created by a regression test setup step.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param filePath - Example-relative file path to remove.
   * @returns Promise that resolves after the file is absent.
   */
  public async removeExampleFile(
    exampleDirectory: string,
    filePath: string,
  ): Promise<void> {
    await rm(join(this.resolveExampleDirectory(exampleDirectory), filePath), {
      force: true,
    });
  }

  /**
   * Reads one UTF-8 output file from an example project.
   *
   * @param exampleDirectory - Repository-relative example project directory.
   * @param filePath - Example-relative file path to read.
   * @returns Exact UTF-8 contents of the file.
   */
  public async readExampleFile(
    exampleDirectory: string,
    filePath: string,
  ): Promise<string> {
    return await readFile(
      join(this.resolveExampleDirectory(exampleDirectory), filePath),
      "utf8",
    );
  }

  /**
   * Runs one command and preserves stdout and stderr when it fails.
   *
   * @param command - Executable name such as `npm`.
   * @param args - Positional command arguments.
   * @param cwd - Absolute working directory for the command.
   * @param label - Human-readable command label used in failure messages.
   * @returns Captured stdout after the command exits successfully.
   */
  public async runCommand(
    command: string,
    args: readonly string[],
    cwd: string,
    label: string,
  ): Promise<string> {
    try {
      const { stdout } = await execFileAsync(command, [...args], {
        cwd,
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        timeout: 300_000,
      });

      return stdout;
    } catch (error: unknown) {
      throw new Error(`${label} failed${this.describeCommandFailure(error)}`, {
        cause: error,
      });
    }
  }

  private async assertPackedPackageInstall(
    exampleDirectory: string,
    exampleName: string,
    packageDirectory: string,
  ): Promise<void> {
    const packagePath = join(
      this.resolveExampleDirectory(exampleDirectory),
      packageDirectory,
    );
    const packageStat = await lstat(packagePath);

    if (packageStat.isSymbolicLink()) {
      throw new Error(
        `${exampleName} installed ${packageDirectory} as a symlink instead of a packed package.`,
      );
    }

    await access(join(packagePath, "dist"));
  }

  private describeCommandFailure(error: unknown): string {
    const failureDetails: string[] = [];

    if (error instanceof Error && error.message.trim().length > 0) {
      failureDetails.push(`message:\n${error.message.trim()}`);
    }

    if (typeof error !== "object" || error === null) {
      return this.formatFailureDetails(failureDetails);
    }

    if (
      "stdout" in error &&
      typeof error.stdout === "string" &&
      error.stdout.trim().length > 0
    ) {
      failureDetails.push(`stdout:\n${error.stdout.trim()}`);
    }

    if (
      "stderr" in error &&
      typeof error.stderr === "string" &&
      error.stderr.trim().length > 0
    ) {
      failureDetails.push(`stderr:\n${error.stderr.trim()}`);
    }

    return this.formatFailureDetails(failureDetails);
  }

  private formatFailureDetails(failureDetails: readonly string[]): string {
    if (failureDetails.length === 0) {
      return ".";
    }

    return `:\n${failureDetails.join("\n\n")}`;
  }
}
