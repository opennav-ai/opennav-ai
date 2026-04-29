import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";

/**
 * Site and source page data needed to create one Markdown page artifact.
 */
export interface MarkdownPageArtifactGenerateInput {
  /**
   * Public site root used to calculate the generated Markdown artifact URL.
   *
   * The generated file path is relative to the output directory, but the URL is
   * also returned so later content files can point agents at the same endpoint.
   */
  readonly baseUrl: string;

  /**
   * Metadata-only page record for the source page being mirrored as Markdown.
   *
   * The source path decides the generated `.md` endpoint path. The source
   * content format decides whether the body is reused as Markdown or converted
   * from parsed HTML.
   */
  readonly page: OpenNavPageMetadata;

  /**
   * Validated metadata-only page records for the current static site.
   *
   * This list is passed into the page Markdown content generator so links in
   * HTML-derived Markdown can point to generated `.md` endpoints for known
   * internal pages without reading any other page bodies.
   */
  readonly pages: readonly OpenNavPageMetadata[];

  /**
   * Exact UTF-8 body read from the page source file.
   *
   * This generator does not read from disk. Callers provide one page body at a
   * time so large sites do not need to keep every source file in memory.
   */
  readonly sourceContent: string;

  /**
   * Whether the generated Markdown artifact should include a root `llms.txt` backlink.
   *
   * Physical Markdown files generated from HTML pages set this to `true` so an
   * agent reading the page can navigate back to the site index. Content reused
   * inside `llms-full.txt` sets this to `false` so the full-context file does
   * not repeat page footers.
   */
  readonly includeSiteIndexBacklink: boolean;
}
