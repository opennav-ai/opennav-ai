import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { AccessGuidanceBuildInput } from "../types/access-guidance-build-input";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import type { RobotsTxtSourceFile } from "../types/robots-txt-source-file";
import { ContentSignalsGuidanceBuilder } from "./content-signals-guidance-builder";
import { RobotsTxtGuidanceBuilder } from "./robots-txt-guidance-builder";

interface AccessGuidanceBuilderDependencies {
  readonly contentSignalsGuidanceBuilder?: ContentSignalsGuidanceBuilder;
  readonly robotsTxtGuidanceBuilder?: RobotsTxtGuidanceBuilder;
  readonly fileReader?: EngineFileReader;
}

/**
 * Coordinates optional static access guidance planners.
 */
export class AccessGuidanceBuilder {
  readonly #contentSignalsGuidanceBuilder: ContentSignalsGuidanceBuilder;
  readonly #robotsTxtGuidanceBuilder: RobotsTxtGuidanceBuilder;
  readonly #fileReader: EngineFileReader;

  /**
   * Creates a builder with default access-guidance collaborators.
   *
   * @param dependencies - Optional collaborator overrides for focused tests.
   */
  public constructor(dependencies: AccessGuidanceBuilderDependencies = {}) {
    this.#contentSignalsGuidanceBuilder =
      dependencies.contentSignalsGuidanceBuilder ??
      new ContentSignalsGuidanceBuilder();
    this.#robotsTxtGuidanceBuilder =
      dependencies.robotsTxtGuidanceBuilder ?? new RobotsTxtGuidanceBuilder();
    this.#fileReader = dependencies.fileReader ?? new EngineFileReader();
  }

  /**
   * Plans static access guidance from caller configuration and existing files.
   *
   * @param input - Source file references, output directory, and optional Content Signals preferences.
   * @returns Planned access guidance files with warnings, or a typed file read error.
   */
  public async build(
    input: AccessGuidanceBuildInput,
  ): Promise<Result<AccessGuidanceBuildResult, OpenNavError>> {
    const contentSignalsResult = this.#contentSignalsGuidanceBuilder.build({
      contentSignals: input.contentSignals,
    });
    const robotsTxtFileResult = await this.findRobotsTxtSourceFile(input);

    if (robotsTxtFileResult.isErr()) {
      return err(robotsTxtFileResult.error);
    }

    return ok(
      this.#robotsTxtGuidanceBuilder.build({
        buildFingerprint: input.buildFingerprint,
        robotsTxtFile: robotsTxtFileResult.value,
        contentSignalLine: contentSignalsResult.contentSignalLine,
      }),
    );
  }

  private async findRobotsTxtSourceFile(
    input: AccessGuidanceBuildInput,
  ): Promise<Result<RobotsTxtSourceFile | undefined, OpenNavError>> {
    const robotsTxtFile = input.sourceFileReferences.find(
      (sourceFile: EngineFileReference): boolean =>
        sourceFile.kind === "robots",
    );

    if (robotsTxtFile === undefined) {
      return ok(undefined);
    }

    const readResult = await this.#fileReader.read({
      outputDirectory: input.outputDirectory,
      filePath: robotsTxtFile.filePath,
    });

    if (readResult.isErr()) {
      return err(readResult.error);
    }

    return ok({
      filePath: readResult.value.filePath,
      content: readResult.value.content,
    });
  }
}
