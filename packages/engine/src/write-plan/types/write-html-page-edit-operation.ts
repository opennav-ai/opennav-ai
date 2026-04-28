import type { ResourceLink } from "../../resource-links/types/resource-link";
import type { EngineFilePath } from "../../types/engine-file-path";

/**
 * Planned HTML `<head>` edit for a built page file.
 */
export interface WriteHtmlPageEditOperation {
  /**
   * Filesystem action approved for this existing HTML file.
   *
   * The later writer must apply this as a narrow page edit, not as a blind
   * whole-file replacement.
   */
  readonly kind: "edit-html-page";

  /**
   * Output-directory-relative HTML page path that should receive resource links.
   *
   * The path has already been checked to stay inside `outputDirectory`.
   */
  readonly outputFilePath: EngineFilePath;

  /**
   * Zero-based source string offset immediately after the opening `<head>` tag.
   *
   * The later writer re-checks this offset against current file content before
   * inserting markup so stale plans do not corrupt HTML.
   */
  readonly headInsertionOffset: number;

  /**
   * Exact HTML `<link>` markup to insert into the page `<head>`.
   *
   * The markup starts and ends with a newline and does not include the
   * surrounding `<head>` element.
   */
  readonly headLinkMarkup: string;

  /**
   * Semantic links represented by `headLinkMarkup`.
   *
   * This lets reports and later validation describe the concrete alternate
   * Markdown page and root `llms.txt` index relationships without parsing HTML.
   */
  readonly links: readonly ResourceLink[];
}
