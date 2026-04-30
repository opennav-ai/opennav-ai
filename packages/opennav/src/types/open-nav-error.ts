/**
 * Typed OpenNav failure or warning returned without throwing for expected
 * product errors.
 */
export interface OpenNavError {
  /**
   * Stable machine-readable identifier for the failure or warning.
   *
   * Callers can use this value for branching, logs, and tests without parsing
   * the human-readable message.
   */
  readonly code: string;

  /**
   * Human-readable explanation safe to show in CLI or build output.
   *
   * The message describes the concrete file, option, or validation problem
   * when one is available.
   */
  readonly message: string;

  /**
   * Structured details for the failure or warning.
   *
   * Values may include output-directory-relative paths, URLs, command option
   * names, or lower-level causes. The object is empty when there is no useful
   * extra context.
   */
  readonly context: Readonly<Record<string, unknown>>;
}
