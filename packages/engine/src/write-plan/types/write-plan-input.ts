import type { AccessGuidanceFile } from "../../access-guidance/types/access-guidance-file";
import type { AgentContentFile } from "../../agent-content/types/agent-content-file";
import type { ResourceLinkPageEdit } from "../../resource-links/types/resource-link-page-edit";

/**
 * In-memory generated outputs and edits that need a single filesystem plan.
 */
export interface WritePlanInput {
  /**
   * Absolute or process-relative path to the built static output folder.
   *
   * Every planned output path is resolved against this directory and rejected
   * when it would escape the folder.
   */
  readonly outputDirectory: string;

  /**
   * Lazy OpenNav-generated files such as `llms.txt`, generated Markdown pages,
   * and `.well-known/opennav.json`.
   *
   * The planner uses each path immediately and keeps content callbacks lazy.
   */
  readonly generatedFiles: readonly AgentContentFile[];

  /**
   * HTML page resource-link edits planned for existing built `.html` files.
   *
   * These edits modify caller-built pages without replacing the whole file.
   */
  readonly pageEdits: readonly ResourceLinkPageEdit[];

  /**
   * Static access-guidance files such as configured `robots.txt` content.
   *
   * These entries already preserve caller-owned `robots.txt` content where the
   * access-guidance builder found a safe edit.
   */
  readonly accessGuidanceFiles: readonly AccessGuidanceFile[];
}
