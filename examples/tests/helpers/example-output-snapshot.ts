import { readdir, readFile } from "node:fs/promises";
import { join, sep } from "node:path";

/**
 * Reads a built example output directory into a deterministic text snapshot.
 */
export class ExampleOutputSnapshot {
  private readonly outputDirectory: string;

  /**
   * Stores the output directory that will be snapshotted.
   *
   * @param outputDirectory - Absolute path to an example build output
   * directory such as `dist` or `out`.
   */
  public constructor(outputDirectory: string) {
    this.outputDirectory = outputDirectory;
  }

  /**
   * Reads every regular file under the output directory in sorted order.
   *
   * @returns Output-directory-relative POSIX paths and exact UTF-8 contents.
   */
  public async read(): Promise<
    readonly { readonly filePath: string; readonly content: string }[]
  > {
    const outputFilePaths = await this.collectOutputFilePaths(
      this.outputDirectory,
      this.outputDirectory,
    );
    const files: { readonly filePath: string; readonly content: string }[] = [];

    for (const outputFilePath of outputFilePaths) {
      files.push({
        filePath: outputFilePath,
        content: await readFile(join(this.outputDirectory, outputFilePath), {
          encoding: "utf8",
        }),
      });
    }

    return files;
  }

  private async collectOutputFilePaths(
    outputDirectory: string,
    directory: string,
  ): Promise<readonly string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const outputFilePaths: string[] = [];

    for (const entry of entries.sort((first, second): number =>
      first.name.localeCompare(second.name),
    )) {
      const absoluteEntryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        outputFilePaths.push(
          ...(await this.collectOutputFilePaths(
            outputDirectory,
            absoluteEntryPath,
          )),
        );
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      outputFilePaths.push(
        this.toPosixRelativePath(outputDirectory, absoluteEntryPath),
      );
    }

    return outputFilePaths;
  }

  private toPosixRelativePath(
    outputDirectory: string,
    absoluteFilePath: string,
  ): string {
    return absoluteFilePath
      .slice(outputDirectory.length + 1)
      .split(sep)
      .join("/");
  }
}
