/**
 * Site owner preference for one generated Content Signals directive value.
 */
export type OpenNavContentSignalPermission = "allow" | "disallow";

/**
 * Optional Content Signals preferences for generated `robots.txt` guidance.
 */
export interface OpenNavContentSignalsPolicy {
  /**
   * Preference for search indexing and search result snippets.
   *
   * When populated, OpenNav writes `search=yes` or `search=no` inside its
   * managed `Content-signal` directive. When omitted, OpenNav does not express
   * a search-use preference.
   */
  readonly search?: OpenNavContentSignalPermission | undefined;

  /**
   * Preference for real-time AI input use such as grounding or retrieval.
   *
   * When populated, OpenNav writes `ai-input=yes` or `ai-input=no` inside its
   * managed `Content-signal` directive. When omitted, OpenNav does not express
   * an AI-input preference.
   */
  readonly aiInput?: OpenNavContentSignalPermission | undefined;

  /**
   * Preference for model training or fine-tuning use.
   *
   * When populated, OpenNav writes `ai-train=yes` or `ai-train=no` inside its
   * managed `Content-signal` directive. When omitted, OpenNav does not express
   * an AI-training preference.
   */
  readonly aiTrain?: OpenNavContentSignalPermission | undefined;
}

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
