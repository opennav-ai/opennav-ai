import { err, ok, type Result } from "neverthrow";
import { BuildFingerprintCommentBuilder } from "../../build-fingerprint/services/build-fingerprint-comment-builder";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileBuildFingerprintDecorateInput } from "../types/agent-content-file-build-fingerprint-decorate-input";
import type { AgentContentFileContent } from "../types/agent-content-file-content";

interface AgentContentFileBuildFingerprintDecoratorDependencies {
  readonly buildFingerprintCommentBuilder?: BuildFingerprintCommentBuilder;
}

/**
 * Appends bottom build fingerprint markers to lazy generated agent content files.
 */
export class AgentContentFileBuildFingerprintDecorator {
  readonly #buildFingerprintCommentBuilder: BuildFingerprintCommentBuilder;

  /**
   * Creates a decorator with default build fingerprint collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(
    dependencies: AgentContentFileBuildFingerprintDecoratorDependencies = {},
  ) {
    this.#buildFingerprintCommentBuilder =
      dependencies.buildFingerprintCommentBuilder ??
      new BuildFingerprintCommentBuilder();
  }

  /**
   * Wraps a generated file so its lazy content includes an OpenNav build fingerprint marker.
   *
   * @param input - Generated file and build fingerprint metadata for the wrapper.
   * @returns Generated file with the same output path and marked lazy content.
   */
  public decorate(
    input: AgentContentFileBuildFingerprintDecorateInput,
  ): AgentContentFile {
    return {
      outputFilePath: input.file.outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        const contentResult = await input.file.getContent();

        if (contentResult.isErr()) {
          return err(contentResult.error);
        }

        const marker = this.#buildFingerprintCommentBuilder.build({
          format: "html-comment",
          buildFingerprint: input.buildFingerprint,
        });

        return ok({
          content: this.appendMarker(
            contentResult.value.content,
            marker.content,
          ),
          warnings: contentResult.value.warnings,
        });
      },
    };
  }

  private appendMarker(content: string, markerContent: string): string {
    const separator = content.endsWith("\n") ? "\n" : "\n\n";

    return `${content}${separator}${markerContent}`;
  }
}
