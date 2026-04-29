import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { WritePlan } from "../../write-plan/types/write-plan";

/**
 * Inputs for reporting a dry-run build result before files are written.
 */
export interface BuildResultReportDryRunInput {
  /**
   * Ordered file operations approved by write planning.
   *
   * `create-file` operations become planned creations, while `overwrite-file`
   * and `edit-html-page` operations become planned modifications.
   */
  readonly writePlan: WritePlan;

  /**
   * Output-directory-relative paths intentionally ignored before write planning.
   *
   * These paths usually come from unsupported input files, ignored `robots.txt`
   * page metadata, or generated files omitted by a token cap.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed issues collected before the dry-run report is produced.
   *
   * The reporter passes these through in order so later CLI output can explain
   * exactly why any path was skipped or any optional output was omitted.
   */
  readonly warnings: readonly OpenNavError[];
}
