import type { OpenNavError } from "../common/types/opennav-error";
import type { EngineFilePath } from "./engine-file-path";

/**
 * Machine-readable report returned after an engine execution.
 */
export interface EngineExecuteResult {
  /**
   * Output-directory-relative file paths for files the engine created.
   *
   * A path appears here when the file did not exist before the run and the
   * engine wrote it, or when a dry run reports that the file would be created.
   */
  readonly createdFilePaths: readonly EngineFilePath[];

  /**
   * Output-directory-relative file paths for existing files whose contents the
   * engine modified.
   *
   * A path appears here when the file already existed before the run and the
   * engine updated its content, or when a dry run reports that the file would
   * be updated. The path itself is not renamed or moved.
   */
  readonly modifiedFilePaths: readonly EngineFilePath[];

  /**
   * Output-directory-relative file paths the engine intentionally skipped.
   *
   * A path appears here when the engine saw the file but did not process or
   * write it. The reason should be available in `warnings` when the skip is
   * notable for users, such as an unsupported file type.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed issues collected during execution.
   *
   * Warnings explain recoverable conditions while allowing the engine to
   * continue, such as skipping an unsupported file from `filePaths`.
   */
  readonly warnings: readonly OpenNavError[];
}
