import type { OpenNavError } from "../common/types/opennav-error";
import type { EngineFilePath } from "./engine-file-path";

/**
 * Report returned after the engine creates, changes, skips, warns, or fails.
 */
export interface EngineExecuteResult {
  readonly createdFilePaths: readonly EngineFilePath[];
  readonly changedFilePaths: readonly EngineFilePath[];
  readonly skippedFilePaths: readonly EngineFilePath[];
  readonly warnings: readonly OpenNavError[];
  readonly failures: readonly OpenNavError[];
}
