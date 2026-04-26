import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFile } from "./engine-file";

/**
 * Result data returned after reading supported built site files.
 */
export interface EngineFileListReadResult {
  /** Supported built site files read from the output directory. */
  readonly files: readonly EngineFile[];

  /** Built file paths the engine recognized but intentionally skipped. */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /** Non-fatal warnings collected while reading file paths. */
  readonly warnings: readonly OpenNavError[];
}
