import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { EngineContentSignalsPolicy } from "../../types/engine-content-signals-policy";

/**
 * Existing crawler files and configured preferences needed to plan access guidance.
 */
export interface AccessGuidanceBuildInput {
  /**
   * Short deterministic fingerprint for the current OpenNav build run.
   *
   * When OpenNav creates or updates its managed `robots.txt` block, this value
   * is written into the block build fingerprint marker. The value uses
   * `sha256:<12 hex characters>` format and matches generated files, the
   * manifest, and HTML resource-link fingerprints for the run.
   */
  readonly buildFingerprint: string;

  /**
   * Absolute or process-relative path to the built static output directory.
   *
   * When a `robots.txt` source reference is present, the builder reads that
   * file from this directory before planning Content Signals guidance. The
   * builder does not write to this directory.
   */
  readonly outputDirectory: string;

  /**
   * Supported source files discovered in the built static output folder.
   *
   * The first reference whose kind is `robots` is treated as the existing root
   * `robots.txt` file. If no such reference exists and Content Signals are
   * configured, OpenNav plans a new `robots.txt` file.
   */
  readonly sourceFileReferences: readonly EngineFileReference[];

  /**
   * Caller-provided Content Signals preferences.
   *
   * When omitted, OpenNav does not create or edit `robots.txt` for Content
   * Signals because the engine has no default rights or content-use policy.
   */
  readonly contentSignals?: EngineContentSignalsPolicy | undefined;
}
