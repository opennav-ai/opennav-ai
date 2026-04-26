import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFile } from "../types/engine-file";
import type { EngineFileListReadInput } from "../types/engine-file-list-read-input";
import type { EngineFileListReadResult } from "../types/engine-file-list-read-result";
import { EngineFileReader } from "./engine-file-reader";
import { FileKindDetector } from "./file-kind-detector";

/**
 * Reads supported built site files and reports unsupported files as warnings.
 */
export class EngineFileListReader {
  readonly #fileKindDetector: FileKindDetector;
  readonly #fileReader: EngineFileReader;

  public constructor(
    fileKindDetector: FileKindDetector = new FileKindDetector(),
    fileReader: EngineFileReader = new EngineFileReader(fileKindDetector),
  ) {
    this.#fileKindDetector = fileKindDetector;
    this.#fileReader = fileReader;
  }

  /**
   * Reads supported built site files from an output directory.
   *
   * @param input - Output directory and built file paths to read.
   * @returns Supported file data with non-fatal warnings, or a typed OpenNav AI error.
   */
  public async read(
    input: EngineFileListReadInput,
  ): Promise<Result<EngineFileListReadResult, OpenNavError>> {
    const files: EngineFile[] = [];
    const warnings: OpenNavError[] = [];

    for (const filePath of input.filePaths) {
      const kindResult = this.#fileKindDetector.detect(filePath);

      if (kindResult.isErr()) {
        return err(kindResult.error);
      }

      if (kindResult.value === "unsupported") {
        warnings.push(this.createUnsupportedFileWarning(filePath));
        continue;
      }

      const fileResult = await this.#fileReader.read({
        outputDirectory: input.outputDirectory,
        filePath,
      });

      if (fileResult.isErr()) {
        return err(fileResult.error);
      }

      files.push(fileResult.value);
    }

    return ok({
      files,
      warnings,
    });
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
}
