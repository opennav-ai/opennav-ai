import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * One filesystem change applied from an approved write plan.
 */
export interface DistWriteRecord {
  /**
   * Concrete write action that succeeded.
   *
   * The value mirrors the approved write-plan operation while describing what
   * happened on disk: a new file was created, an existing file was overwritten,
   * or an existing HTML page received a planned `<head>` edit.
   */
  readonly kind: "created-file" | "overwritten-file" | "edited-html-page";

  /**
   * Output-directory-relative path that changed.
   *
   * The path is relative to the `outputDirectory` passed to the writer and
   * describes the file whose content changed. The path itself is not renamed or
   * moved.
   */
  readonly outputFilePath: EngineFilePath;
}
