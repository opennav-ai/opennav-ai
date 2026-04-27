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
   * Existing Markdown page paths are not listed here when they reserve a path
   * that an HTML mirror would otherwise generate, because the file already
   * exists in the output directory.
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
