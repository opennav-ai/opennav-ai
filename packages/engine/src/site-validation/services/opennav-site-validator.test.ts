import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { SiteValidationResult } from "../types/site-validation-result";
import { OpenNavSiteValidator } from "./opennav-site-validator";

describe("OpenNavSiteValidator", (): void => {
  it("returns an exact pass result for a valid site", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        mode: "strict",
        pages: [
          {
            sourceFilePath: "index.html",
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: "Welcome to Example Docs.",
          },
          {
            sourceFilePath: "docs/api.md",
            sourceContentType: "markdown",
            route: "/docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: "API",
            description: undefined,
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        warnings: [],
      });
    }
  });

  it("returns an exact failure in strict mode when a page title is missing", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        mode: "strict",
        pages: [
          {
            sourceFilePath: "docs/api.md",
            sourceContentType: "markdown",
            route: "/docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: undefined,
            description: "Use the OpenNav AI engine.",
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_PAGE_TITLE_MISSING",
        message: "A page title is required in strict validation mode.",
        context: {
          sourceFilePath: "docs/api.md",
          route: "/docs/api",
          mode: "strict",
        },
      });
    }
  });

  it("returns an exact warning in loose mode when a page title is missing", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "docs/api.md",
            sourceContentType: "markdown",
            route: "/docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: undefined,
            description: "Use the OpenNav AI engine.",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        warnings: [
          {
            code: "SITE_VALIDATION_PAGE_TITLE_MISSING",
            message:
              "A page title is missing, so loose validation will allow fallback behavior.",
            context: {
              sourceFilePath: "docs/api.md",
              route: "/docs/api",
              mode: "loose",
            },
          },
        ],
      });
    }
  });
});
