import type { OpenNavError } from "../../common/types/opennav-error";
import type { WritePlan } from "./write-plan";

/**
 * Result payload for a successful dry-run write planning pass.
 */
export interface WritePlanResult {
  /**
   * Ordered file operations approved for a later writer.
   *
   * A successful result means every operation target has passed path safety and
   * duplicate ownership checks.
   */
  readonly plan: WritePlan;

  /**
   * Non-fatal planning issues that should appear in later reports.
   *
   * The first write-planning slice returns an empty array. Later protected-file
   * skip behavior can report warnings here when the run can continue.
   */
  readonly warnings: readonly OpenNavError[];
}
