import { createHash } from "node:crypto";
import type { BuildFingerprintFileInput } from "../types/build-fingerprint-file-input";
import type { BuildFingerprintInput } from "../types/build-fingerprint-input";

/**
 * Builds deterministic fingerprints for OpenNav-generated artifacts.
 */
export class BuildFingerprintBuilder {
  /**
   * Builds a deterministic SHA-256 fingerprint for one engine run.
   *
   * @param input - Normalized run settings, source file fingerprints, and optional access guidance.
   * @returns Fingerprint in `sha256:<hex>` format.
   */
  public buildBuildFingerprint(input: BuildFingerprintInput): string {
    const normalizedInput = {
      baseUrl: input.baseUrl,
      contentSignals: [...(input.contentSignals ?? [])].sort(),
      siteName: input.siteName,
      sourceFiles: [...input.sourceFiles]
        .sort(
          (
            firstFile: BuildFingerprintFileInput,
            secondFile: BuildFingerprintFileInput,
          ): number => firstFile.filePath.localeCompare(secondFile.filePath),
        )
        .map(
          (
            fileInput: BuildFingerprintFileInput,
          ): {
            readonly contentFingerprint: string;
            readonly filePath: string;
          } => ({
            contentFingerprint: fileInput.contentFingerprint,
            filePath: fileInput.filePath,
          }),
        ),
    };

    return this.buildContentFingerprint(JSON.stringify(normalizedInput));
  }

  /**
   * Builds a SHA-256 fingerprint for source or generated content.
   *
   * @param content - Exact UTF-8 content to fingerprint.
   * @returns Fingerprint in `sha256:<hex>` format.
   */
  public buildContentFingerprint(content: string): string {
    return `sha256:${createHash("sha256")
      .update(content, "utf8")
      .digest("hex")}`;
  }
}
