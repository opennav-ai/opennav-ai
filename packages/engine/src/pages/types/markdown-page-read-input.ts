import type { EngineFile } from "../../input/types/engine-file";

/**
 * Input needed to create lightweight page metadata from one already-read Markdown file.
 */
export interface MarkdownPageReadInput {
  /**
   * Public site root used to build the page canonical URL.
   *
   * The value may include a path prefix, and route joining follows the same
   * rules as `PageUrlBuilder`.
   */
  readonly baseUrl: string;

  /**
   * Source file content and output-directory-relative path for the Markdown page.
   *
   * The file must have `kind: "markdown"`; other file kinds are rejected
   * because they require different extraction rules.
   */
  readonly file: EngineFile;
}
