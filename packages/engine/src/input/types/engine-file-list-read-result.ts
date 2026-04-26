import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { EngineFileReference } from "./engine-file-reference";

/**
 * Result data returned after resolving supported built site file references.
 */
export interface EngineFileListReadResult {
  /**
   * Supported built site files that exist under the output directory.
   *
   * The references include paths and detected file kinds, not file contents, so
   * later stages can process large sites without holding every page body in
   * memory at once.
   */
  readonly fileReferences: readonly EngineFileReference[];

  /**
   * Output-directory-relative file paths the engine recognized but intentionally skipped.
   *
   * Unsupported files appear here so callers can report that they were seen but
   * not processed.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed issues collected while resolving file references.
   *
   * Warnings explain recoverable conditions such as skipping unsupported file
   * types while still allowing supported paths to continue.
   */
  readonly warnings: readonly OpenNavError[];
}
