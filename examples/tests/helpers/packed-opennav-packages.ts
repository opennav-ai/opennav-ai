import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExampleBuildTestRunner } from "./example-build-test-runner.ts";

/**
 * Builds and packs local OpenNav workspace packages for example installs.
 */
export class PackedOpenNavPackages {
  private readonly openNavTarballPathValue: string;
  private readonly packageArchiveDirectoryValue: string;

  private constructor(
    openNavTarballPath: string,
    packageArchiveDirectory: string,
  ) {
    this.openNavTarballPathValue = openNavTarballPath;
    this.packageArchiveDirectoryValue = packageArchiveDirectory;
  }

  /**
   * Builds the local packages and returns tarballs ready for example installs.
   *
   * @param runner - Shared command runner rooted at the OpenNav workspace.
   * @returns Packed package tarball paths plus a cleanup method.
   */
  public static async create(
    runner: ExampleBuildTestRunner,
  ): Promise<PackedOpenNavPackages> {
    await runner.runCommand(
      "npm",
      ["run", "build", "--workspace", "@opennav-ai/opennav"],
      runner.repositoryDirectory,
      "build @opennav-ai/opennav",
    );

    const packageArchiveDirectory = await mkdtemp(
      join(tmpdir(), "opennav-example-packages-"),
    );

    try {
      const openNavTarballPath =
        await PackedOpenNavPackages.packWorkspacePackage(
          runner,
          packageArchiveDirectory,
          "packages/opennav",
          "pack @opennav-ai/opennav",
        );

      return new PackedOpenNavPackages(
        openNavTarballPath,
        packageArchiveDirectory,
      );
    } catch (error: unknown) {
      await rm(packageArchiveDirectory, {
        force: true,
        recursive: true,
      });

      throw error;
    }
  }

  /**
   * Returns the packed OpenNav package tarball path.
   *
   * @returns Absolute path to the `@opennav-ai/opennav` tarball.
   */
  public get openNavTarballPath(): string {
    return this.openNavTarballPathValue;
  }

  /**
   * Removes the temporary directory that stores package tarballs.
   *
   * @returns Promise that resolves after package archives are removed.
   */
  public async dispose(): Promise<void> {
    await rm(this.packageArchiveDirectoryValue, {
      force: true,
      recursive: true,
    });
  }

  private static async packWorkspacePackage(
    runner: ExampleBuildTestRunner,
    packageArchiveDirectory: string,
    packageDirectory: string,
    label: string,
  ): Promise<string> {
    const stdout = await runner.runCommand(
      "npm",
      [
        "pack",
        join(runner.repositoryDirectory, packageDirectory),
        "--pack-destination",
        packageArchiveDirectory,
        "--cache",
        ".npm-cache",
      ],
      runner.repositoryDirectory,
      label,
    );
    const tarballFileName = stdout
      .trim()
      .split(/\r?\n/u)
      .filter((line: string): boolean => line.length > 0)
      .at(-1);

    if (tarballFileName === undefined) {
      throw new Error(`${label} did not report a package tarball.`);
    }

    return join(packageArchiveDirectory, tarballFileName);
  }
}
