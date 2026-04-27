import type { OpenNavPage } from "../../pages/types/opennav-page";

/**
 * Site and page metadata needed to create the root `llms.txt` file.
 */
export interface LlmsTxtGenerateInput {
  /**
   * Human-readable site name shown as the top-level heading in `llms.txt`.
   *
   * The value should come from validated engine input so the generated file can
   * identify the static site before listing page links.
   */
  readonly siteName: string;

  /**
   * Public site root used as the prefix for generated Markdown artifact URLs.
   *
   * Page links in `llms.txt` point to mirrored `.md` endpoints, and this value
   * determines their absolute URL prefix.
   */
  readonly baseUrl: string;

  /**
   * Optional short summary for the whole site.
   *
   * When populated, the generated `llms.txt` can include this text under the
   * site heading. When omitted, no site-level description line is written.
   */
  readonly siteDescription?: string | undefined;

  /**
   * Metadata-only page records that should appear in `llms.txt`.
   *
   * The generator groups these pages by route so large sites produce a
   * scan-friendly file. Each page should already have passed site validation.
   */
  readonly pages: readonly OpenNavPage[];
}
