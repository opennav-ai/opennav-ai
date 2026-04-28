import type { AccessGuidanceBuildInput } from "../types/access-guidance-build-input";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import { ContentSignalsGuidanceBuilder } from "./content-signals-guidance-builder";
import { RobotsTxtGuidanceBuilder } from "./robots-txt-guidance-builder";

interface AccessGuidanceBuilderDependencies {
  readonly contentSignalsGuidanceBuilder?: ContentSignalsGuidanceBuilder;
  readonly robotsTxtGuidanceBuilder?: RobotsTxtGuidanceBuilder;
}

/**
 * Coordinates optional static access guidance planners.
 */
export class AccessGuidanceBuilder {
  readonly #contentSignalsGuidanceBuilder: ContentSignalsGuidanceBuilder;
  readonly #robotsTxtGuidanceBuilder: RobotsTxtGuidanceBuilder;

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
  }

  /**
   * Plans static access guidance from caller configuration and existing files.
   *
   * @param input - Existing `robots.txt` content and optional Content Signals preferences.
   * @returns Planned access guidance files and non-fatal warnings.
   */
  public build(input: AccessGuidanceBuildInput): AccessGuidanceBuildResult {
    const contentSignalsResult = this.#contentSignalsGuidanceBuilder.build({
      contentSignals: input.contentSignals,
    });

    return this.#robotsTxtGuidanceBuilder.build({
      robotsTxtFile: input.robotsTxtFile,
      contentSignalLine: contentSignalsResult.contentSignalLine,
    });
  }
}
