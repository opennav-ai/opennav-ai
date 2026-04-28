import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * One source file contribution to a deterministic OpenNav build fingerprint.
 */
export interface BuildFingerprintFileInput {
  /**
   * Output-directory-relative source path included in the build.
   *
   * Paths are sorted by this value before hashing so callers can pass files in
   * framework discovery order without changing the resulting build fingerprint.
   */
  readonly filePath: EngineFilePath;

  /**
   * SHA-256 fingerprint of the source file content.
   *
   * The value should use the `sha256:<hex>` format returned by
   * `BuildFingerprintBuilder.buildContentFingerprint(...)`.
   */
  readonly contentFingerprint: string;
}
