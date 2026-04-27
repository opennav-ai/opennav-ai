import { ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { IndexMdFallbackGenerateInput } from "../types/index-md-fallback-generate-input";
import type { IndexMdFallbackGenerateResult } from "../types/index-md-fallback-generate-result";

const ROOT_INDEX_MD_FALLBACK_OUTPUT_FILE_PATH: EngineFilePath = "index.md";

/**
 * Copies an already generated root page Markdown body to the optional `index.md` fallback path.
 *
 * This class does not read source files or convert HTML. For an `index.html`
 * page, callers should pass the Markdown body already returned by
 * `PageMarkdownContentGenerator`. For an existing `index.md` page, callers can
 * pass that generated Markdown body through unchanged. Framework adapters can
 * also pass any route `/` page when their mirrored Markdown artifact is not
 * already `index.md`.
 */
export class IndexMdFallbackGenerator {
  /**
   * Returns the existing root page Markdown body as in-memory `index.md` fallback content.
   *
   * @param input - Fallback support flag, root page metadata, and existing generated Markdown body.
   * @returns Generated fallback content, or an empty optional result when disabled.
   */
  public generate(
    input: IndexMdFallbackGenerateInput,
  ): Result<IndexMdFallbackGenerateResult, OpenNavError> {
    if (!input.enabled || !this.isRootPage(input.page)) {
      return ok({
        outputFilePath: undefined,
        content: undefined,
        skippedFilePaths: [],
        warnings: [],
      });
    }

    return ok({
      outputFilePath: ROOT_INDEX_MD_FALLBACK_OUTPUT_FILE_PATH,
      content: input.markdownContent,
      skippedFilePaths: [],
      warnings: [],
    });
  }

  private isRootPage(page: OpenNavPage): boolean {
    return page.route === "/";
  }
}
