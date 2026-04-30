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
    const signalParts = this.buildFingerprintSignals(input);

    if (signalParts.length === 0) {
      return {
        contentSignalLine: undefined,
      };
    }

    return {
      contentSignalLine: `Content-signal: ${signalParts.join(", ")}`,
    };
  }

  /**
   * Builds deterministic Content Signals parts for the OpenNav build fingerprint.
   *
   * @param input - Caller-configured content-use preferences.
   * @returns Serialized signal assignments without the `Content-signal:` directive prefix.
   */
  public buildFingerprintSignals(
    input: ContentSignalsGuidanceBuildInput,
  ): readonly string[] {
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

    return signalParts;
  }

  /**
   * Checks whether the caller explicitly configured Content Signals.
   *
   * @param input - Caller-provided content-use preferences.
   * @returns `true` when the policy object exists, including an empty policy.
   */
  public hasConfiguredSignals(
    input: ContentSignalsGuidanceBuildInput,
  ): boolean {
    return input.contentSignals !== undefined;
  }

  private formatPermission(permission: EngineContentSignalPermission): string {
    if (permission === "allow") {
      return "yes";
    }

    return "no";
  }
}
