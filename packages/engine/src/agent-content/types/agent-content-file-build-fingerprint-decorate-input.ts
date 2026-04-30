import type { AgentContentFile } from "./agent-content-file";

/**
 * Generated file and metadata needed to append an OpenNav build fingerprint marker.
 */
export interface AgentContentFileBuildFingerprintDecorateInput {
  /**
   * Generated file whose lazy content should receive a bottom build fingerprint marker.
   *
   * The decorator preserves this file's output path and wraps its `getContent`
   * callback without reading content during planning.
   */
  readonly file: AgentContentFile;

  /**
   * Short deterministic fingerprint shared by every generated file from the same build run.
   *
   * The value is written into the marker appended to this file's
   * generated content. It uses `sha256:<12 hex characters>` format and matches
   * the manifest, `robots.txt`, and HTML resource-link fingerprints for the run.
   */
  readonly buildFingerprint: string;
}
