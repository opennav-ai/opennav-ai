import type { BuildFingerprintFileInput } from "./build-fingerprint-file-input";

/**
 * Normalized engine-run inputs used to create one build fingerprint.
 */
export interface BuildFingerprintInput {
  /**
   * Human-readable site name used for the run.
   *
   * Changing this value changes the build fingerprint because generated
   * artifacts such as `llms.txt` include it in their content.
   */
  readonly siteName: string;

  /**
   * Public base URL used to generate artifact links.
   *
   * Changing this value changes the build fingerprint because generated links
   * in OpenNav files are different.
   */
  readonly baseUrl: string;

  /**
   * Source files and source fingerprints available to the run.
   *
   * Entries are sorted by `filePath` before hashing so stable inputs produce a
   * stable build fingerprint regardless of caller array order.
   */
  readonly sourceFiles: readonly BuildFingerprintFileInput[];

  /**
   * Serialized optional access-guidance directives included in the run.
   *
   * Content Signals are included here when configured so changing the generated
   * `robots.txt` guidance changes the build fingerprint.
   */
  readonly contentSignals?: readonly string[] | undefined;
}
