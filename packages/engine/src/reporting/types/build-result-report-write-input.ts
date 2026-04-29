import type { OpenNavError } from "../../common/types/opennav-error";
import type { DistWriteRecord } from "../../dist-write/types/dist-write-record";
import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Inputs for reporting a completed real write.
 */
export interface BuildResultReportWriteInput {
  /**
   * Ordered records returned by the dist writer after successful filesystem changes.
   *
   * `created-file` records become created paths, while `overwritten-file` and
   * `edited-html-page` records become modified paths.
   */
  readonly records: readonly DistWriteRecord[];

  /**
   * Output-directory-relative paths intentionally ignored before or during build.
   *
   * These paths are preserved exactly so the final report describes every known
   * skipped file without requiring the CLI to inspect internal phases.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed issues collected before and during file writing.
   *
   * The reporter passes these through in order, including warnings produced by
   * lazy generated-file content providers after a file was written.
   */
  readonly warnings: readonly OpenNavError[];
}
