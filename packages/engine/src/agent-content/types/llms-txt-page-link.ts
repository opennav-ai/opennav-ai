/**
 * One Markdown artifact link shown under a section in `llms.txt`.
 */
export interface LlmsTxtPageLink {
  /**
   * Human-readable label displayed inside the Markdown link.
   *
   * The value comes from validated page metadata when available. Loose
   * validation may allow later fallback labels for pages with missing titles.
   */
  readonly title: string;

  /**
   * Absolute URL for the generated Markdown page artifact.
   *
   * This points to the mirrored `.md` endpoint for the page, such as
   * `docs/api.html` becoming `docs/api.md`.
   */
  readonly url: string;

  /**
   * Optional short page summary appended after the link in `llms.txt`.
   *
   * When the source page has no description, the line is written without a
   * description suffix.
   */
  readonly description: string | undefined;
}
