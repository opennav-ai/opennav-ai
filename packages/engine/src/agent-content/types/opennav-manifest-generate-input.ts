/**
 * Static site data needed to generate `/.well-known/opennav.json`.
 */
export interface OpenNavManifestGenerateInput {
  /**
   * Public site root represented by the manifest.
   *
   * Agents use this value to connect the compatibility manifest to the site it
   * describes. The value should already be validated by the engine caller.
   */
  readonly baseUrl: string;

  /**
   * Short deterministic fingerprint shared by generated OpenNav files for this run.
   *
   * The manifest stores the same value that file-level compatibility markers
   * expose, allowing agents and write planning to group outputs by build. The
   * value uses `sha256:<12 hex characters>` format and matches every
   * `build-fingerprint` marker and `data-opennav-sha` link from the run.
   */
  readonly buildFingerprint: string;

  /**
   * Whether this static output includes OpenNav HTML resource links.
   *
   * The value is true when OpenNav can point HTML pages to their Markdown
   * mirrors and root agent index through generated `<head>` links.
   */
  readonly htmlResourceLinks: boolean;

  /**
   * Whether this static output includes configured Content Signals guidance.
   *
   * The value is true only when the caller provided a Content Signals policy
   * that OpenNav can represent in `robots.txt`.
   */
  readonly contentSignals: boolean;
}
