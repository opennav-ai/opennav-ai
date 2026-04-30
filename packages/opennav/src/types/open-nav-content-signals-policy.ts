import type { OpenNavContentSignalPermission } from "./open-nav-content-signal-permission";

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
