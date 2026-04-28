import type { EngineFilePath } from "../../types/engine-file-path";
import type { PageContentType } from "./page-content-type";

/**
 * Lightweight internal page data used by OpenNav generators and validators.
 */
export interface OpenNavPage {
  /**
   * Output-directory-relative path for the source page file.
   *
   * This points to the existing built file that produced the page metadata.
   * Full page content is intentionally not stored on this object so large sites
   * can keep page lists in memory without retaining every body string.
   */
  readonly sourceFilePath: EngineFilePath;

  /**
   * Original source format for the page file.
   *
   * Later content readers use this value to decide whether a page body can be
   * reused as Markdown or must be converted from HTML when generating readable
   * page artifacts.
   */
  readonly sourceContentType: PageContentType;

  /**
   * Browser path where the page is served on the static site.
   *
   * The value starts with `/` and is derived from the source file path, such as
   * `docs/index.md` becoming `/docs/`.
   */
  readonly route: string;

  /**
   * Absolute public URL for the page.
   *
   * Generated files and discovery annotations use this value when they need an
   * agent-openable page address, such as links in `llms.txt`, Markdown
   * artifacts, HTML head tags, or HTTP `Link` header guidance.
   */
  readonly canonicalUrl: string;

  /**
   * Human-readable page title extracted from the source file.
   *
   * Markdown pages populate this from the first top-level `#` heading when one
   * exists. The value is `undefined` when no reader can find a concrete title;
   * validation decides later whether that is fatal.
   */
  readonly title: string | undefined;

  /**
   * Short page summary extracted from the source file.
   *
   * Markdown pages populate this from the first normal paragraph when one
   * exists. The value is `undefined` when the page has no suitable paragraph.
   */
  readonly description: string | undefined;
}
