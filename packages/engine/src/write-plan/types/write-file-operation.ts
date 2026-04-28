import type { EngineFilePath } from "../../types/engine-file-path";
import type { WriteFileContentProvider } from "./write-file-content-provider";

/**
 * Planned whole-file creation or overwrite inside the static output folder.
 */
export interface WriteFileOperation {
  /**
   * Filesystem action approved for this output path.
   *
   * `create-file` means the target path was missing during planning.
   * `overwrite-file` means the target existed and was recognized as
   * OpenNav-managed content that can be replaced by this run.
   */
  readonly kind: "create-file" | "overwrite-file";

  /**
   * Output-directory-relative file path that the later writer may create or replace.
   *
   * The path has already been checked to stay inside `outputDirectory`. Parent
   * directories may still need to be created by the later writer.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Lazy callback that returns the exact file body for the later writer.
   *
   * The callback is preserved from generated content planners when possible so
   * duplicate-path and path-safety failures do not force body generation.
   */
  readonly contentProvider: WriteFileContentProvider;
}
