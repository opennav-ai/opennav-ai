import type { Result } from "neverthrow";
import type { AgentContentFileContent } from "../../agent-content/types/agent-content-file-content";
import type { OpenNavError } from "../../common/types/opennav-error";

/**
 * Lazy content provider for a planned file write.
 */
export interface WriteFileContentProvider {
  /**
   * Produces the exact UTF-8 body for one planned file write.
   *
   * The write planner keeps this callback lazy so dry-run planning can report
   * target paths and create/overwrite behavior without reading or converting
   * page bodies.
   *
   * @returns Generated text content with file-specific warnings, or a typed OpenNav AI error.
   */
  getContent(): Promise<Result<AgentContentFileContent, OpenNavError>>;
}
