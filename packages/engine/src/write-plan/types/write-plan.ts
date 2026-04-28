import type { WriteOperation } from "./write-operation";

/**
 * Ordered dry-run plan for every file change the engine intends to make.
 */
export interface WritePlan {
  /**
   * Approved file operations in deterministic writer order.
   *
   * Generated content files come first, followed by HTML page edits and
   * access-guidance files. The later writer should apply this order exactly so
   * dry-run reports and real writes match.
   */
  readonly operations: readonly WriteOperation[];
}
