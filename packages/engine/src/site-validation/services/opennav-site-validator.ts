import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { SiteValidationInput } from "../types/site-validation-input";
import type { SiteValidationMessage } from "../types/site-validation-message";
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
    if (this.isBlank(input.siteName)) {
      return err(this.createMissingSiteNameError(input));
    }

    if (!this.isHttpUrl(input.baseUrl)) {
      return err(this.createInvalidBaseUrlError(input));
    }

    const invalidRoutePage = this.findInvalidRoutePage(input.pages);

    if (invalidRoutePage !== undefined) {
      return err(this.createInvalidRouteError(input, invalidRoutePage));
    }

    const invalidCanonicalUrlPage = this.findInvalidCanonicalUrlPage(
      input.pages,
    );

    if (invalidCanonicalUrlPage !== undefined) {
      return err(
        this.createInvalidCanonicalUrlError(input, invalidCanonicalUrlPage),
      );
    }

    const outsideBaseUrlPage = this.findOutsideBaseUrlPage(input);

    if (outsideBaseUrlPage !== undefined) {
      return err(this.createOutsideBaseUrlError(input, outsideBaseUrlPage));
    }

    const duplicateRoutePages = this.findDuplicateRoutePages(input.pages);

    if (duplicateRoutePages !== undefined) {
      return err(this.createDuplicateRouteError(input, duplicateRoutePages));
    }

    const duplicateCanonicalUrlPages = this.findDuplicateCanonicalUrlPages(
      input.pages,
    );

    if (duplicateCanonicalUrlPages !== undefined) {
      return err(
        this.createDuplicateCanonicalUrlError(
          input,
          duplicateCanonicalUrlPages,
        ),
      );
    }

    if (input.mode === "strict") {
      const missingTitlePage = this.findMissingTitlePage(input.pages);

      if (missingTitlePage !== undefined) {
        return err(this.createMissingTitleError(input, missingTitlePage));
      }
    }

    return ok({
      warnings: this.createMissingTitleWarnings(input),
    });
  }

  private createDuplicateCanonicalUrlError(
    input: SiteValidationInput,
    pages: readonly [OpenNavPage, OpenNavPage],
  ): OpenNavError {
    const [firstPage, secondPage] = pages;

    return {
      code: "SITE_VALIDATION_DUPLICATE_PAGE_CANONICAL_URL",
      message:
        "Page canonical URLs must be unique before generating OpenNav files.",
      context: {
        canonicalUrl: firstPage.canonicalUrl,
        sourceFilePaths: [firstPage.sourceFilePath, secondPage.sourceFilePath],
        mode: input.mode,
      },
    };
  }

  private createDuplicateRouteError(
    input: SiteValidationInput,
    pages: readonly [OpenNavPage, OpenNavPage],
  ): OpenNavError {
    const [firstPage, secondPage] = pages;

    return {
      code: "SITE_VALIDATION_DUPLICATE_PAGE_ROUTE",
      message: "Page routes must be unique before generating OpenNav files.",
      context: {
        route: firstPage.route,
        sourceFilePaths: [firstPage.sourceFilePath, secondPage.sourceFilePath],
        mode: input.mode,
      },
    };
  }

  private createInvalidBaseUrlError(input: SiteValidationInput): OpenNavError {
    return {
      code: "SITE_VALIDATION_BASE_URL_INVALID",
      message:
        "A valid absolute HTTP or HTTPS base URL is required before generating OpenNav files.",
      context: {
        baseUrl: input.baseUrl,
        mode: input.mode,
      },
    };
  }

  private createInvalidCanonicalUrlError(
    input: SiteValidationInput,
    page: OpenNavPage,
  ): OpenNavError {
    return {
      code: "SITE_VALIDATION_PAGE_CANONICAL_URL_INVALID",
      message:
        "A valid absolute HTTP or HTTPS canonical URL is required before generating OpenNav files.",
      context: {
        sourceFilePath: page.sourceFilePath,
        canonicalUrl: page.canonicalUrl,
        mode: input.mode,
      },
    };
  }

  private createInvalidRouteError(
    input: SiteValidationInput,
    page: OpenNavPage,
  ): OpenNavError {
    return {
      code: "SITE_VALIDATION_PAGE_ROUTE_INVALID",
      message:
        "A page route must start with / before generating OpenNav files.",
      context: {
        sourceFilePath: page.sourceFilePath,
        route: page.route,
        mode: input.mode,
      },
    };
  }

  private createOutsideBaseUrlError(
    input: SiteValidationInput,
    page: OpenNavPage,
  ): OpenNavError {
    return {
      code: "SITE_VALIDATION_PAGE_CANONICAL_URL_OUTSIDE_BASE_URL",
      message: "A page canonical URL must be inside the configured base URL.",
      context: {
        sourceFilePath: page.sourceFilePath,
        canonicalUrl: page.canonicalUrl,
        baseUrl: input.baseUrl,
        mode: input.mode,
      },
    };
  }

  private createMissingSiteNameError(input: SiteValidationInput): OpenNavError {
    return {
      code: "SITE_VALIDATION_SITE_NAME_MISSING",
      message: "A site name is required before generating OpenNav files.",
      context: {
        siteName: input.siteName,
        mode: input.mode,
      },
    };
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

  private createMissingTitleWarning(
    input: SiteValidationInput,
    page: OpenNavPage,
  ): SiteValidationMessage {
    return {
      code: "SITE_VALIDATION_PAGE_TITLE_MISSING",
      message:
        "A page title is missing, so loose validation will allow fallback behavior.",
      context: {
        sourceFilePath: page.sourceFilePath,
        route: page.route,
        mode: input.mode,
      },
    };
  }

  private createMissingTitleWarnings(
    input: SiteValidationInput,
  ): readonly SiteValidationMessage[] {
    if (input.mode !== "loose") {
      return [];
    }

    return input.pages
      .filter((page: OpenNavPage): boolean => page.title === undefined)
      .map(
        (page: OpenNavPage): SiteValidationMessage =>
          this.createMissingTitleWarning(input, page),
      );
  }

  private findMissingTitlePage(
    pages: readonly OpenNavPage[],
  ): OpenNavPage | undefined {
    return pages.find((page: OpenNavPage): boolean => page.title === undefined);
  }

  private findInvalidRoutePage(
    pages: readonly OpenNavPage[],
  ): OpenNavPage | undefined {
    return pages.find(
      (page: OpenNavPage): boolean => !this.isRoute(page.route),
    );
  }

  private findInvalidCanonicalUrlPage(
    pages: readonly OpenNavPage[],
  ): OpenNavPage | undefined {
    return pages.find(
      (page: OpenNavPage): boolean => !this.isHttpUrl(page.canonicalUrl),
    );
  }

  private findDuplicateCanonicalUrlPages(
    pages: readonly OpenNavPage[],
  ): readonly [OpenNavPage, OpenNavPage] | undefined {
    const pagesByCanonicalUrl = new Map<string, OpenNavPage>();

    for (const page of pages) {
      const firstPage = pagesByCanonicalUrl.get(page.canonicalUrl);

      if (firstPage !== undefined) {
        return [firstPage, page];
      }

      pagesByCanonicalUrl.set(page.canonicalUrl, page);
    }

    return undefined;
  }

  private findDuplicateRoutePages(
    pages: readonly OpenNavPage[],
  ): readonly [OpenNavPage, OpenNavPage] | undefined {
    const pagesByRoute = new Map<string, OpenNavPage>();

    for (const page of pages) {
      const firstPage = pagesByRoute.get(page.route);

      if (firstPage !== undefined) {
        return [firstPage, page];
      }

      pagesByRoute.set(page.route, page);
    }

    return undefined;
  }

  private isBlank(value: string): boolean {
    return value.trim() === "";
  }

  private isHttpUrl(value: string): boolean {
    if (!URL.canParse(value)) {
      return false;
    }

    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  }

  private findOutsideBaseUrlPage(
    input: SiteValidationInput,
  ): OpenNavPage | undefined {
    const baseUrl = new URL(input.baseUrl);

    return input.pages.find(
      (page: OpenNavPage): boolean =>
        !this.isInsideBaseUrl(new URL(page.canonicalUrl), baseUrl),
    );
  }

  private isInsideBaseUrl(canonicalUrl: URL, baseUrl: URL): boolean {
    if (canonicalUrl.origin !== baseUrl.origin) {
      return false;
    }

    if (baseUrl.pathname === "/") {
      return true;
    }

    const basePath = baseUrl.pathname.endsWith("/")
      ? baseUrl.pathname
      : `${baseUrl.pathname}/`;

    return canonicalUrl.pathname.startsWith(basePath);
  }

  private isRoute(value: string): boolean {
    return !this.isBlank(value) && value.startsWith("/");
  }
}
