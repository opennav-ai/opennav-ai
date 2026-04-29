import type { OpenNavError } from "../../common/types/opennav-error";
import type { DistWriteRecord } from "./dist-write-record";

/**
 * Successful result from applying an approved write plan to the output folder.
 */
export interface DistWriteResult {
  /**
   * Ordered records for file changes that completed successfully.
   *
   * Records are returned in the same order as the write-plan operations so
   * reports from dry-run planning and real writing describe files consistently.
   */
  readonly records: readonly DistWriteRecord[];

  /**
   * Non-fatal issues returned while generating file content.
   *
   * Lazy content providers can return warnings such as token-cap notices. The
   * writer preserves those warnings after the file body is written.
   */
  readonly warnings: readonly OpenNavError[];
}
