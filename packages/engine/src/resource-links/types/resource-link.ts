import type { ResourceLinkRelation } from "./resource-link-relation";

/**
 * Semantic web link from one page to an agent-readable resource.
 */
export interface ResourceLink {
  /**
   * Relationship between the current page and the linked target.
   *
   * `alternate` is used for the generated Markdown representation of the same
   * page. `index` is used for the root `llms.txt` site index.
   */
  readonly relation: ResourceLinkRelation;

  /**
   * MIME type hint for the linked resource.
   *
   * Page Markdown mirrors use `text/markdown`; root `llms.txt` uses
   * `text/plain`.
   */
  readonly mediaType: string;

  /**
   * Absolute public URL for the linked resource.
   *
   * The value is built from the configured `baseUrl` and points at a file that
   * will exist in the static output folder after OpenNav writes its plan.
   */
  readonly href: string;

  /**
   * Optional human-readable label for the linked resource.
   *
   * The root `llms.txt` index link uses this to explain that the target is the
   * LLM-readable site index. Page-level Markdown alternates omit it.
   */
  readonly title?: string | undefined;
}
