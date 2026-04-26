import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileListReadInput } from "../types/engine-file-list-read-input";
import type { EngineFileListReadResult } from "../types/engine-file-list-read-result";
import type { EngineFileReference } from "../types/engine-file-reference";
import { FileKindDetector } from "./file-kind-detector";

/**
 * Resolves supported built site file references and reports unsupported files as warnings.
 */
export class EngineFileListReader {
  readonly #fileKindDetector: FileKindDetector;

  public constructor(
    fileKindDetector: FileKindDetector = new FileKindDetector(),
  ) {
    this.#fileKindDetector = fileKindDetector;
  }

  /**
   * Resolves supported built site files from an output directory without reading their contents.
   *
   * @param input - Output directory and built file paths to resolve.
   * @returns Supported file references with non-fatal warnings, or a typed OpenNav AI error.
   */
  public async read(
    input: EngineFileListReadInput,
  ): Promise<Result<EngineFileListReadResult, OpenNavError>> {
    const fileReferences: EngineFileReference[] = [];
    const skippedFilePaths: EngineFilePath[] = [];
    const warnings: OpenNavError[] = [];

    for (const filePath of input.filePaths) {
      const kindResult = this.#fileKindDetector.detect(filePath);

      if (kindResult.isErr()) {
        return err(kindResult.error);
      }

      if (kindResult.value === "unsupported") {
        skippedFilePaths.push(filePath);
        warnings.push(this.createUnsupportedFileWarning(filePath));
        continue;
      }

      const resolvedFilePath = this.resolveFilePath(
        input.outputDirectory,
        filePath,
      );

      if (
        !this.isInsideOutputDirectory(input.outputDirectory, resolvedFilePath)
      ) {
        return err(this.createOutsideOutputDirectoryError(input, filePath));
      }

      const fileExistsResult = await this.checkFileExists(
        input.outputDirectory,
        filePath,
        resolvedFilePath,
      );

      if (fileExistsResult.isErr()) {
        return err(fileExistsResult.error);
      }

      fileReferences.push({
        filePath,
        kind: kindResult.value,
      });
    }

    return ok({
      fileReferences,
      skippedFilePaths,
      warnings,
    });
  }

  private async checkFileExists(
    outputDirectory: string,
    filePath: EngineFilePath,
    resolvedFilePath: string,
  ): Promise<Result<void, OpenNavError>> {
    const accessPromise = access(resolvedFilePath, constants.R_OK);

    return ResultAsync.fromPromise(
      accessPromise,
      (cause: unknown): OpenNavError =>
        this.createReadError(outputDirectory, filePath, cause),
    );
  }

  private createReadError(
    outputDirectory: string,
    filePath: EngineFilePath,
    cause: unknown,
  ): OpenNavError {
    return {
      code: "ENGINE_FILE_READ_FAILED",
      message: "The engine could not read the built site file.",
      context: {
        outputDirectory,
        filePath,
        cause: this.describeCause(cause),
      },
    };
  }

  private createOutsideOutputDirectoryError(
    input: EngineFileListReadInput,
    filePath: EngineFilePath,
  ): OpenNavError {
    return {
      code: "ENGINE_FILE_OUTSIDE_OUTPUT_DIRECTORY",
      message: "The engine can only read files inside the output directory.",
      context: {
        outputDirectory: input.outputDirectory,
        filePath,
      },
    };
  }

  private createUnsupportedFileWarning(filePath: EngineFilePath): OpenNavError {
    return {
      code: "ENGINE_FILE_UNSUPPORTED",
      message: "The engine skipped an unsupported built site file.",
      context: {
        filePath,
        kind: "unsupported",
      },
    };
  }

  private describeCause(cause: unknown): string {
    if (cause instanceof Error) {
      return cause.message;
    }

    return String(cause);
  }

  private isInsideOutputDirectory(
    outputDirectory: string,
    resolvedFilePath: string,
  ): boolean {
    const resolvedOutputDirectory = resolve(outputDirectory);
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

  private resolveFilePath(
    outputDirectory: string,
    filePath: EngineFilePath,
  ): string {
    if (isAbsolute(filePath)) {
      return resolve(filePath);
    }

    return resolve(outputDirectory, filePath);
  }
}
