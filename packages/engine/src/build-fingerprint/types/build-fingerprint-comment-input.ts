import type { BuildFingerprintCommentFormat } from "./build-fingerprint-comment-format";

/**
 * Metadata needed to format an OpenNav build fingerprint marker.
 */
export interface BuildFingerprintCommentInput {
  /**
   * Comment syntax to use for the marker.
   *
   * Markdown and text artifacts use `html-comment`; `robots.txt` managed blocks
   * use `line-comment` because robots files use `#` comments.
   */
  readonly format: BuildFingerprintCommentFormat;

  /**
   * Short deterministic fingerprint for the OpenNav run that produced the content.
   *
   * Every OpenNav-generated file and managed block from the same run receives
   * this same value. The value uses `sha256:<12 hex characters>` format and
   * matches the run manifest and HTML resource-link fingerprints.
   */
  readonly buildFingerprint: string;
}
