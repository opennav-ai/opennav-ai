import type { Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";

/**
 * One source page available to the lazy agent content builder.
 */
export interface AgentContentBuildPage {
  /**
   * Metadata-only page record used to plan output paths and route ordering.
   *
   * The builder can list generated file paths from this data without reading
   * the source body. The content callback is used only when a generated file
   * actually needs the page body.
   */
  readonly page: OpenNavPageMetadata;

  /**
   * Reads the exact UTF-8 source body for this page on demand.
   *
   * Markdown artifacts and `llms-full.txt` call this callback from their lazy
   * `getContent` paths. Planning does not call it, so large sites do not need
   * to materialize every source page body up front.
   *
   * @returns Source page text or a typed OpenNav AI read error.
   */
  getSourceContent(): Promise<Result<string, OpenNavError>>;
}
