import type { Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileContent } from "../types/agent-content-file-content";

const WELL_KNOWN_DIRECTORY: EngineFilePath = ".well-known";

/**
 * Builds duplicate root and `.well-known` placements for one generated `llms` file.
 *
 * Phase 1 writes `llms.txt` and `llms-full.txt` in two public locations. The
 * root files support agents that already look for the common top-level
 * convention, while the `.well-known` copies support agents that begin from
 * standardized metadata paths. Both placements must expose the same generated
 * content, warnings, and typed failures.
 *
 * This class owns only placement. It does not format `llms.txt`, build
 * `llms-full.txt`, read page bodies, inspect existing files, or decide whether
 * a later write should create or overwrite a path. It receives one root
 * `AgentContentFile` whose `getContent` callback already knows how to generate
 * the file body, and returns two planned file entries:
 *
 * - the original root path, such as `llms.txt`
 * - the matching `.well-known` path, such as `.well-known/llms.txt`
 *
 * The returned entries share one cached lazy content callback. Planning does
 * not call `getContent`, and if both placements are later written, the
 * underlying content generation runs once so the duplicate files receive the
 * exact same result.
 */
export class LlmsFilePlacementBuilder {
  /**
   * Creates root and `.well-known` file entries for one generated `llms` file.
   *
   * @param rootFile - Generated root file entry, such as `llms.txt` or `llms-full.txt`.
   * @returns Root and `.well-known` placements in deterministic write-priority order.
   */
  public build(rootFile: AgentContentFile): readonly AgentContentFile[] {
    const getContent = this.createSharedContentCallback(rootFile);

    return [
      {
        outputFilePath: rootFile.outputFilePath,
        getContent,
      },
      {
        outputFilePath: this.buildWellKnownOutputFilePath(
          rootFile.outputFilePath,
        ),
        getContent,
      },
    ];
  }

  private buildWellKnownOutputFilePath(
    rootOutputFilePath: EngineFilePath,
  ): EngineFilePath {
    return `${WELL_KNOWN_DIRECTORY}/${rootOutputFilePath}`;
  }

  private createSharedContentCallback(
    rootFile: AgentContentFile,
  ): () => Promise<Result<AgentContentFileContent, OpenNavError>> {
    let contentPromise:
      | Promise<Result<AgentContentFileContent, OpenNavError>>
      | undefined;

    return (): Promise<Result<AgentContentFileContent, OpenNavError>> => {
      if (contentPromise === undefined) {
        contentPromise = rootFile.getContent();
      }

      return contentPromise;
    };
  }
}
