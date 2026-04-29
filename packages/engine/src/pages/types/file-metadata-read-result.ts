import type { OpenNavPageMetadata } from "./opennav-page";

/**
 * Result data returned after creating page metadata from file references.
 */
export interface FileMetadataReadResult {
  /**
   * Metadata-only page records created from HTML and Markdown source files.
   *
   * Entries preserve the input file reference order for page files. Each entry
   * includes source path, route, canonical URL, title, and description, but not
   * the page body.
   */
  readonly pageMetadata: readonly OpenNavPageMetadata[];
}
