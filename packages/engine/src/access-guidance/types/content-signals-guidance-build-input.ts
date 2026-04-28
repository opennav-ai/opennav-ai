import type { EngineContentSignalsPolicy } from "../../types/engine-content-signals-policy";

/**
 * Configured Content Signals preferences to serialize for `robots.txt`.
 */
export interface ContentSignalsGuidanceBuildInput {
  /**
   * Caller-provided content-use preferences.
   *
   * When omitted or empty, no `Content-signal` directive is serialized.
   */
  readonly contentSignals?: EngineContentSignalsPolicy | undefined;
}
