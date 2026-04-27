import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Public site root and page route data needed to address a generated Markdown artifact.
 */
export interface MarkdownPageArtifactPathBuildInput {
  /**
   * Public site root used as the prefix for generated Markdown artifact URLs.
   *
   * The value may include a path prefix, such as `https://example.com/docs`.
   * Generated artifact URLs are appended below that root.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page record whose source file path determines the Markdown endpoint.
   *
   * The source file itself is not read here. This path builder mirrors the
   * output-directory-relative page path and changes `.html` endings to `.md`.
   */
  readonly page: OpenNavPage;
}
