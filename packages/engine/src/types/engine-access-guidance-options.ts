import type { EngineContentSignalsPolicy } from "./engine-content-signals-policy";

/**
 * Optional static access guidance configured by the engine caller.
 */
export interface EngineAccessGuidanceOptions {
  /**
   * Content-use preferences to write into `robots.txt`.
   *
   * OpenNav does not emit Content Signals by default. This field must be
   * populated by the caller before the engine creates or edits `robots.txt` for
   * Content Signals guidance.
   */
  readonly contentSignals?: EngineContentSignalsPolicy | undefined;
}
