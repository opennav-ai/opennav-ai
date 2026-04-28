import type { EngineContentSignalsPolicy } from "../../types/engine-content-signals-policy";
import type { RobotsTxtSourceFile } from "./robots-txt-source-file";

/**
 * Existing crawler files and configured preferences needed to plan access guidance.
 */
export interface AccessGuidanceBuildInput {
  /**
   * Deterministic fingerprint for the current OpenNav build run.
   *
   * When OpenNav creates or updates its managed `robots.txt` block, this value
   * is written into the block build fingerprint marker.
   */
  readonly buildFingerprint: string;

  /**
   * Existing root `robots.txt` content from the built static output folder.
   *
   * When omitted and Content Signals are configured, OpenNav plans a new
   * `robots.txt` file containing only the minimum `User-agent: *` group needed
   * for the configured `Content-signal` directive.
   */
  readonly robotsTxtFile?: RobotsTxtSourceFile | undefined;

  /**
   * Caller-provided Content Signals preferences.
   *
   * When omitted, OpenNav does not create or edit `robots.txt` for Content
   * Signals because the engine has no default rights or content-use policy.
   */
  readonly contentSignals?: EngineContentSignalsPolicy | undefined;
}
