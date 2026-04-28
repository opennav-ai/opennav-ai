/**
 * Formatted OpenNav build fingerprint marker ready to append to generated content.
 */
export interface BuildFingerprintCommentResult {
  /**
   * Complete single-line comment for the build fingerprint marker.
   *
   * The string ends with a newline and does not include leading blank lines, so
   * callers can decide how much spacing belongs before the marker.
   */
  readonly content: string;
}
