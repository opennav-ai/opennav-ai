import type { WritePlan } from "../../write-plan/types/write-plan";

/**
 * Approved write plan and target folder for a real static output write.
 */
export interface DistWriteInput {
  /**
   * Absolute or process-relative path to the built static output folder.
   *
   * Every operation path is resolved against this directory again at write time
   * so stale or unsafe plans cannot write outside the caller's output folder.
   */
  readonly outputDirectory: string;

  /**
   * Ordered create, overwrite, and HTML edit operations approved by planning.
   *
   * The writer executes these operations exactly in order and does not add new
   * overwrite decisions of its own.
   */
  readonly plan: WritePlan;
}
