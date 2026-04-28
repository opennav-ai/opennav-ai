import type { RobotsTxtSourceFile } from "./robots-txt-source-file";

/**
 * Existing `robots.txt` content and optional directive to plan together.
 */
export interface RobotsTxtGuidanceBuildInput {
  /**
   * Deterministic fingerprint for the current OpenNav build run.
   *
   * Managed `robots.txt` blocks include this value so later runs can identify
   * the OpenNav-owned block without claiming ownership of the full file.
   */
  readonly buildFingerprint: string;

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
