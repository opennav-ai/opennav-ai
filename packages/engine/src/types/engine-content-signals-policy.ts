import type { EngineContentSignalPermission } from "./engine-content-signal-permission";

/**
 * Optional Content Signals preferences for generated `robots.txt` guidance.
 */
export interface EngineContentSignalsPolicy {
  /**
   * Preference for use in search indexing and search result snippets.
   *
   * When populated, OpenNav writes the value as `search=yes` or `search=no`
   * inside the generated `Content-signal` directive. When omitted, OpenNav does
   * not express a search-use preference.
   */
  readonly search?: EngineContentSignalPermission | undefined;

  /**
   * Preference for use as real-time AI input, such as grounding or retrieval.
   *
   * When populated, OpenNav writes the value as `ai-input=yes` or
   * `ai-input=no` inside the generated `Content-signal` directive. When
   * omitted, OpenNav does not express an AI-input preference.
   */
  readonly aiInput?: EngineContentSignalPermission | undefined;

  /**
   * Preference for use in model training or fine-tuning.
   *
   * When populated, OpenNav writes the value as `ai-train=yes` or
   * `ai-train=no` inside the generated `Content-signal` directive. When
   * omitted, OpenNav does not express an AI-training preference.
   */
  readonly aiTrain?: EngineContentSignalPermission | undefined;
}
