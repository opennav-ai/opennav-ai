import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { err, type Result, ResultAsync } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFileReadInput } from "../types/engine-file-read-input";
import type { EngineFileReadResult } from "../types/engine-file-read-result";
import { FileKindDetector } from "./file-kind-detector";

/**
 * Reads built site files from the output directory.
 */
export class EngineFileReader {
  readonly #fileKindDetector: FileKindDetector;

  public constructor(
    fileKindDetector: FileKindDetector = new FileKindDetector(),
  ) {
    this.#fileKindDetector = fileKindDetector;
  }

  /**
   * Reads one built site file and returns its detected kind with exact text content.
   *
   * @param input - Output directory and built file path to read.
   * @returns The read file data or a typed OpenNav AI error.
   */
  public async read(
    input: EngineFileReadInput,
  ): Promise<Result<EngineFileReadResult, OpenNavError>> {
    if (!this.isInsideOutputDirectory(input)) {
      return err(this.createOutsideOutputDirectoryError(input));
    }

    const kindResult = this.#fileKindDetector.detect(input.filePath);

    if (kindResult.isErr()) {
      return err(kindResult.error);
    }

    const readContentPromise: Promise<string> = readFile(
      input.filePath,
      "utf8",
    );
    const contentResult = await ResultAsync.fromPromise(
      readContentPromise,
      (cause: unknown): OpenNavError => this.createReadError(input, cause),
    );

    return contentResult.map(
      (content: string): EngineFileReadResult => ({
        filePath: input.filePath,
        kind: kindResult.value,
        content,
      }),
    );
  }

  private createReadError(
    input: EngineFileReadInput,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "ENGINE_FILE_READ_FAILED",
      message: "The engine could not read the built site file.",
      context: {
        outputDirectory: input.outputDirectory,
        filePath: input.filePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createOutsideOutputDirectoryError(
    input: EngineFileReadInput,
  ): OpenNavError {
    return {
      code: "ENGINE_FILE_OUTSIDE_OUTPUT_DIRECTORY",
      message: "The engine can only read files inside the output directory.",
      context: {
        outputDirectory: input.outputDirectory,
        filePath: input.filePath,
      },
    };
  }

  private isInsideOutputDirectory(input: EngineFileReadInput): boolean {
    const resolvedOutputDirectory = resolve(input.outputDirectory);
    const resolvedFilePath = resolve(input.filePath);
    const relativeFilePath = relative(
      resolvedOutputDirectory,
      resolvedFilePath,
    );

    return (
      relativeFilePath !== "" &&
      !relativeFilePath.startsWith("..") &&
      !isAbsolute(relativeFilePath)
    );
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    return String(cause);
  }
}
