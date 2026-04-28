import type { RobotsTxtSourceFile } from "./robots-txt-source-file";

/**
 * Existing `robots.txt` content and optional directive to plan together.
 */
export interface RobotsTxtGuidanceBuildInput {
  /**
   * Existing root `robots.txt` file from the built output folder.
   *
   * When omitted and `contentSignalLine` is populated, the planner returns a
   * new `robots.txt` file with a minimal `User-agent: *` group.
   */
  readonly robotsTxtFile?: RobotsTxtSourceFile | undefined;

  /**
   * Serialized `Content-signal` directive to add when safe.
   *
   * When omitted, the planner returns no file changes.
   */
  readonly contentSignalLine?: string | undefined;
}
