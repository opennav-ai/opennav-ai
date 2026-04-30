import type { BuildFingerprintFileInput } from "../../build-fingerprint/types/build-fingerprint-file-input";
import type { EngineFileReference } from "../../input/types/engine-file-reference";
import type { OpenNavPageMetadata } from "./opennav-page";

/**
 * Result data returned after preparing source files for metadata-driven planning.
 */
export interface FileMetadataReadResult {
  /**
   * Per-file content fingerprints for supported source files included in the run.
   *
   * OpenNav-managed generated Markdown artifacts are omitted. The engine uses
   * this list to build one deterministic run fingerprint without retaining
   * source file bodies.
   */
  readonly fingerprintFiles: readonly BuildFingerprintFileInput[];

  /**
   * Metadata-only page records created from HTML and Markdown source files.
   *
   * Entries preserve the input file reference order for page files. Each entry
   * includes source path, route, canonical URL, title, and description, but not
   * the page body.
   */
  readonly pageMetadata: readonly OpenNavPageMetadata[];

  /**
   * Lightweight references for supported source files included in the run.
   *
   * OpenNav-managed generated Markdown artifacts are omitted. Later phases use
   * these path/kind pairs to lazily re-read files such as `robots.txt` without
   * keeping source bodies in memory.
   */
  readonly sourceFileReferences: readonly EngineFileReference[];
}
