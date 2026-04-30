/**
 * Output-directory-relative path reported by an OpenNav static build.
 */
export type OpenNavOutputFilePath = string;

/**
 * Typed OpenNav failure or warning returned without throwing for expected
 * product errors.
 */
export interface OpenNavError {
  /**
   * Stable machine-readable identifier for the failure or warning.
   *
   * Callers can use this value for branching, logs, and tests without parsing
   * the human-readable message.
   */
  readonly code: string;

  /**
   * Human-readable explanation safe to show in CLI or build output.
   *
   * The message describes the concrete file, option, or validation problem
   * when one is available.
   */
  readonly message: string;

  /**
   * Structured details for the failure or warning.
   *
   * Values may include output-directory-relative paths, URLs, command option
   * names, or lower-level causes. The object is empty when there is no useful
   * extra context.
   */
  readonly context: Readonly<Record<string, unknown>>;
}

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
