import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "./common/types/opennav-error";
import { EngineFileListReader } from "./input/services/engine-file-list-reader";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteOptions } from "./types/engine-execute-options";
import type { EngineExecuteResult } from "./types/engine-execute-result";

/**
 * Public OpenNav AI engine entrypoint.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Phase 1 intentionally exposes Engine.execute(...) as the public API.
export class Engine {
  /**
   * Executes OpenNav AI against a built static site output directory.
   *
   * @param input - Site settings, output directory, and built file paths to process.
   * @param options - Optional execution settings such as dry-run mode.
   * @returns A typed result containing the execution report or a typed OpenNav AI error.
   */
  public static async execute(
    input: EngineExecuteInput,
    options: EngineExecuteOptions = {},
  ): Promise<Result<EngineExecuteResult, OpenNavError>> {
    void options;

    const fileListReader = new EngineFileListReader();
    const fileListResult = await fileListReader.read({
      outputDirectory: input.outputDirectory,
      filePaths: input.filePaths,
    });

    if (fileListResult.isErr()) {
      return err(fileListResult.error);
    }

    return ok({
      createdFilePaths: [],
      modifiedFilePaths: [],
      skippedFilePaths: fileListResult.value.skippedFilePaths,
      warnings: fileListResult.value.warnings,
    });
  }
}
