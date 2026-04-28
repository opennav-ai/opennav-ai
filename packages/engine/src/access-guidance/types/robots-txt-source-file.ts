import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Existing root `robots.txt` file content from the built output folder.
 */
export interface RobotsTxtSourceFile {
  /**
   * Output-directory-relative path for the existing robots file.
   *
   * Phase 1 expects this to be `robots.txt`; the path is retained in warnings
   * and planned file output so later write planning can address the same file.
   */
  readonly filePath: EngineFilePath;

  /**
   * Exact UTF-8 body currently stored in the built `robots.txt` file.
   *
   * The robots guidance builder preserves this text and inserts configured
   * Content Signals only when it can do so without overwriting conflicting
   * existing signals.
   */
  readonly content: string;
}
