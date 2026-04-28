/**
 * Serialized Content Signals directive for `robots.txt`.
 */
export interface ContentSignalsGuidanceBuildResult {
  /**
   * Complete `Content-signal` directive without a trailing newline.
   *
   * The value is `undefined` when the caller did not configure any Content
   * Signals preferences.
   */
  readonly contentSignalLine: string | undefined;
}
