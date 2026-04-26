import { err, type Result } from "neverthrow";
import type { OpenNavError } from "./common/types/opennav-error";
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
  public static execute(
    input: EngineExecuteInput,
    options: EngineExecuteOptions = {},
  ): Result<EngineExecuteResult, OpenNavError> {
    return err({
      code: "ENGINE_NOT_IMPLEMENTED",
      message: "Engine.execute has been defined but not implemented yet.",
      context: {
        siteName: input.siteName,
        baseUrl: input.baseUrl,
        outputDirectory: input.outputDirectory,
        filePathCount: input.filePaths.length,
        dryRun: options.dryRun ?? false,
      },
    });
  }
}
