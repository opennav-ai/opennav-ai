import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory `llms.txt` content ready for a later write-planning step.
 */
export interface LlmsTxtGenerateResult {
  /**
   * Output-directory-relative path where the generated `llms.txt` content belongs.
   *
   * This generator does not write the file. A later write planner decides
   * whether this path is created or modified on disk.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Complete UTF-8 text content for the generated `llms.txt` file.
   *
   * The string is ready to write as-is and includes its final trailing newline.
   */
  readonly content: string;
}
