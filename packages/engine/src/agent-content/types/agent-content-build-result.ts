import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentFile } from "./agent-content-file";

/**
 * Lazy in-memory plan for generated agent-readable content files.
 */
export interface AgentContentBuildResult {
  /**
   * Generated files in deterministic write-priority order.
   *
   * Each entry exposes its output path immediately and delays body generation
   * until its `getContent` callback is called.
   */
  readonly files: readonly AgentContentFile[];

  /**
   * Output-directory-relative paths intentionally skipped during planning.
   *
   * Duplicate lower-priority fallbacks are not included here because their
   * higher-priority generated file already covers the same path.
   */
  readonly skippedFilePaths: readonly EngineFilePath[];

  /**
   * Non-fatal typed warnings discovered while planning files.
   *
   * File-specific generation warnings, such as `llms-full.txt` token caps, are
   * returned by the individual file's `getContent` callback.
   */
  readonly warnings: readonly OpenNavError[];
}
