import type { OpenNavError } from "../../common/types/opennav-error";
import type { AccessGuidanceFile } from "./access-guidance-file";

/**
 * In-memory result for planned crawler and access guidance.
 */
export interface AccessGuidanceBuildResult {
  /**
   * Guidance files that should be created or updated later.
   *
   * An empty array means the configured policy required no file change, or
   * OpenNav skipped an unsafe edit and reported the reason in `warnings`.
   */
  readonly files: readonly AccessGuidanceFile[];

  /**
   * Non-fatal typed issues found while planning access guidance.
   *
   * Existing conflicting `Content-signal` directives are reported here instead
   * of being overwritten by the planner.
   */
  readonly warnings: readonly OpenNavError[];
}
