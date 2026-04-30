import type { OpenNavError } from "./open-nav-error";
import type { OpenNavOutputFilePath } from "./open-nav-output-file-path";

/**
 * Machine-readable report returned after an OpenNav static build.
 */
export interface OpenNavBuildResult {
  /**
   * Output-directory-relative paths for files OpenNav created.
   *
   * A path appears here when the file did not exist before the run and OpenNav
   * wrote it, or when a dry run reports that the file would be created.
   */
  readonly createdFilePaths: readonly OpenNavOutputFilePath[];

  /**
   * Output-directory-relative paths for existing files whose contents OpenNav
   * modified.
   *
   * A path appears here when the file already existed before the run and
   * OpenNav updated its content, or when a dry run reports that the file would
   * be updated. The path itself is not renamed or moved.
   */
  readonly modifiedFilePaths: readonly OpenNavOutputFilePath[];

  /**
   * Output-directory-relative paths OpenNav intentionally skipped.
   *
   * A path appears here when OpenNav saw the file but did not process or write
   * it. The reason should be available in `warnings` when the skip matters to
   * users, such as an unsupported file type.
   */
  readonly skippedFilePaths: readonly OpenNavOutputFilePath[];

  /**
   * Non-fatal typed issues collected during the build.
   *
   * Warnings explain recoverable conditions while allowing OpenNav to continue,
   * such as skipping an unsupported static output file.
   */
  readonly warnings: readonly OpenNavError[];
}
