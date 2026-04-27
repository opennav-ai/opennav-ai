/**
 * Non-fatal validation message that later reports can show to callers.
 */
export interface SiteValidationMessage {
  /**
   * Stable machine-readable identifier for the validation condition.
   *
   * CLI and adapter code can use this value to format messages without parsing
   * human-facing text.
   */
  readonly code: string;

  /**
   * Human-readable explanation of the validation condition.
   *
   * The message should name the concrete site setting or page field that needs
   * attention.
   */
  readonly message: string;

  /**
   * Structured details that locate the affected setting or page.
   *
   * Values may include paths, routes, canonical URLs, or validation mode, and
   * must be safe to pass through machine-readable reports.
   */
  readonly context: Readonly<Record<string, unknown>>;
}
