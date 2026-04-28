import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * In-memory crawler guidance file planned for a later write step.
 */
export interface AccessGuidanceFile {
  /**
   * Output-directory-relative path where the guidance file belongs.
   *
   * For Phase 1 Content Signals guidance this is `robots.txt`. The file is not
   * written by access-guidance builders; a later write planner decides whether
   * the path is safe to create or update.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Complete UTF-8 text content for the planned guidance file.
   *
   * Existing `robots.txt` content is preserved in this value when OpenNav can
   * safely add configured Content Signals guidance.
   */
  readonly content: string;
}
