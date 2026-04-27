import type { Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentFileContent } from "./agent-content-file-content";

/**
 * Lazy generated file entry returned by the agent content builder.
 */
export interface AgentContentFile {
  /**
   * Output-directory-relative path where this generated file belongs.
   *
   * The path is known during planning, before the file body is generated, so
   * write planning can detect creates, updates, and duplicates cheaply.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Generates this file's body only when the later writer needs it.
   *
   * @returns Generated text content plus any file-specific warnings, or a typed OpenNav AI error.
   */
  getContent(): Promise<Result<AgentContentFileContent, OpenNavError>>;
}
