import type { EngineContentSignalPermission } from "../../types/engine-content-signal-permission";
import type { ContentSignalsGuidanceBuildInput } from "../types/content-signals-guidance-build-input";
import type { ContentSignalsGuidanceBuildResult } from "../types/content-signals-guidance-build-result";

/**
 * Serializes configured Content Signals preferences for `robots.txt`.
 */
export class ContentSignalsGuidanceBuilder {
  /**
   * Builds one deterministic `Content-signal` directive when preferences exist.
   *
   * @param input - Caller-configured content-use preferences.
   * @returns Serialized directive text, or `undefined` when nothing was configured.
   */
  public build(
    input: ContentSignalsGuidanceBuildInput,
  ): ContentSignalsGuidanceBuildResult {
    const signalParts: string[] = [];
    const contentSignals = input.contentSignals;

    if (contentSignals?.search !== undefined) {
      signalParts.push(
        `search=${this.formatPermission(contentSignals.search)}`,
      );
    }

    if (contentSignals?.aiInput !== undefined) {
      signalParts.push(
        `ai-input=${this.formatPermission(contentSignals.aiInput)}`,
      );
    }

    if (contentSignals?.aiTrain !== undefined) {
      signalParts.push(
        `ai-train=${this.formatPermission(contentSignals.aiTrain)}`,
      );
    }

    if (signalParts.length === 0) {
      return {
        contentSignalLine: undefined,
      };
    }

    return {
      contentSignalLine: `Content-signal: ${signalParts.join(", ")}`,
    };
  }

  private formatPermission(permission: EngineContentSignalPermission): string {
    if (permission === "allow") {
      return "yes";
    }

    return "no";
  }
}
