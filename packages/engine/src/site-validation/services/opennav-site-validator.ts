import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { SiteValidationInput } from "../types/site-validation-input";
import type { SiteValidationResult } from "../types/site-validation-result";

/**
 * Checks site settings and metadata-only page data before generation.
 */
export class OpenNavSiteValidator {
  /**
   * Validates that the site and page metadata are ready for generator classes.
   *
   * @param input - Site name, base URL, page metadata, and validation mode.
   * @returns A successful validation result with warnings, or a typed OpenNav AI error.
   */
  public validate(
    input: SiteValidationInput,
  ): Result<SiteValidationResult, OpenNavError> {
    if (input.mode === "strict") {
      const missingTitlePage = this.findMissingTitlePage(input.pages);

      if (missingTitlePage !== undefined) {
        return err(this.createMissingTitleError(input, missingTitlePage));
      }
    }

    return ok({
      warnings: [],
    });
  }

  private createMissingTitleError(
    input: SiteValidationInput,
    page: OpenNavPage,
  ): OpenNavError {
    return {
      code: "SITE_VALIDATION_PAGE_TITLE_MISSING",
      message: "A page title is required in strict validation mode.",
      context: {
        sourceFilePath: page.sourceFilePath,
        route: page.route,
        mode: input.mode,
      },
    };
  }

  private findMissingTitlePage(
    pages: readonly OpenNavPage[],
  ): OpenNavPage | undefined {
    return pages.find((page: OpenNavPage): boolean => page.title === undefined);
  }
}
