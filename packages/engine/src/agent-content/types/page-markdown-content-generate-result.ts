/**
 * In-memory Markdown page content ready for artifact generation.
 */
export interface PageMarkdownContentGenerateResult {
  /**
   * Complete Markdown body for one readable page artifact.
   *
   * The content is not written to disk here. Later generators can place this
   * text inside a mirrored `.md` endpoint file or inline it in `llms-full.txt`.
   */
  readonly content: string;
}
