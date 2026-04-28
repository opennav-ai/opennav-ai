import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Generated OpenNav compatibility manifest ready for later write planning.
 */
export interface OpenNavManifestGenerateResult {
  /**
   * Output-directory-relative path for the manifest.
   *
   * Phase 1 writes the compatibility manifest to `.well-known/opennav.json` so
   * agents have one stable discovery path for the OpenNav static profile.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Complete JSON body for `/.well-known/opennav.json`.
   *
   * The content is valid JSON, includes a final trailing newline, and carries
   * the build fingerprint as a JSON field rather than an appended comment.
   */
  readonly content: string;
}
