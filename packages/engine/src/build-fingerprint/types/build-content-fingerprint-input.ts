import type { BuildContentFingerprintContentKind } from "./build-content-fingerprint-content-kind";

/**
 * Source or generated content that should receive a deterministic fingerprint.
 */
export interface BuildContentFingerprintInput {
  /**
   * Exact UTF-8 file content before fingerprint normalization.
   *
   * HTML and `robots.txt` inputs may have previous OpenNav-managed edits
   * removed before hashing so reruns keep a stable build fingerprint.
   */
  readonly content: string;

  /**
   * Built file kind for source-content normalization.
   *
   * When omitted, the content is hashed exactly. HTML removes existing
   * OpenNav-managed resource links, while robots removes an existing
   * OpenNav-managed Content Signals block.
   */
  readonly sourceContentKind?: BuildContentFingerprintContentKind | undefined;
}
