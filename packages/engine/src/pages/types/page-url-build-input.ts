import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * File path and site URL data needed to create a public page address.
 */
export interface PageUrlBuildInput {
  /**
   * Public site root used as the prefix for canonical page URLs.
   *
   * The value may include a path prefix, such as `https://example.com/docs`,
   * and trailing slashes are ignored when page routes are appended.
   */
  readonly baseUrl: string;

  /**
   * Output-directory-relative HTML or Markdown page path read by the engine.
   *
   * Index files resolve to directory routes, such as `docs/index.html`
   * becoming `/docs/`.
   */
  readonly filePath: EngineFilePath;
}
