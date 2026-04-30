import type { OpenNavContentSignalsPolicy } from "./open-nav-content-signals-policy";

/**
 * Optional access guidance configured for generated static policy files.
 */
export interface OpenNavAccessGuidanceOptions {
  /**
   * Content-use preferences to write into `robots.txt`.
   *
   * OpenNav does not emit Content Signals by default. At least one field in
   * this object must be populated before OpenNav creates or edits
   * `robots.txt` for Content Signals guidance.
   */
  readonly contentSignals?: OpenNavContentSignalsPolicy | undefined;
}
