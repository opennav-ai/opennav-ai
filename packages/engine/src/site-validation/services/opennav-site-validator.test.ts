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

  it("returns an exact failure when the site name is blank", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "   ",
        baseUrl: "https://example.com",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "index.html",
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_SITE_NAME_MISSING",
        message: "A site name is required before generating OpenNav files.",
        context: {
          siteName: "   ",
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when the base URL is invalid", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "not-a-url",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "index.html",
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_BASE_URL_INVALID",
        message:
          "A valid absolute HTTP or HTTPS base URL is required before generating OpenNav files.",
        context: {
          baseUrl: "not-a-url",
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when a page route is invalid", (): void => {
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
            route: "docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: "API",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_PAGE_ROUTE_INVALID",
        message:
          "A page route must start with / before generating OpenNav files.",
        context: {
          sourceFilePath: "docs/api.md",
          route: "docs/api",
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when a page canonical URL is invalid", (): void => {
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
            canonicalUrl: "/docs/api",
            title: "API",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_PAGE_CANONICAL_URL_INVALID",
        message:
          "A valid absolute HTTP or HTTPS canonical URL is required before generating OpenNav files.",
        context: {
          sourceFilePath: "docs/api.md",
          canonicalUrl: "/docs/api",
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when a page canonical URL is outside the base URL", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com/docs/",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "api.md",
            sourceContentType: "markdown",
            route: "/api",
            canonicalUrl: "https://example.com/reference/api",
            title: "API",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_PAGE_CANONICAL_URL_OUTSIDE_BASE_URL",
        message: "A page canonical URL must be inside the configured base URL.",
        context: {
          sourceFilePath: "api.md",
          canonicalUrl: "https://example.com/reference/api",
          baseUrl: "https://example.com/docs/",
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when page routes are duplicated", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "docs.html",
            sourceContentType: "html",
            route: "/docs",
            canonicalUrl: "https://example.com/docs",
            title: "Docs",
            description: undefined,
          },
          {
            sourceFilePath: "docs/index.html",
            sourceContentType: "html",
            route: "/docs",
            canonicalUrl: "https://example.com/docs/",
            title: "Docs Index",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_DUPLICATE_PAGE_ROUTE",
        message: "Page routes must be unique before generating OpenNav files.",
        context: {
          route: "/docs",
          sourceFilePaths: ["docs.html", "docs/index.html"],
          mode: "loose",
        },
      });
    }
  });

  it("returns an exact failure when page canonical URLs are duplicated", (): void => {
    const validator = new OpenNavSiteValidator();
    const result: Result<SiteValidationResult, OpenNavError> =
      validator.validate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        mode: "loose",
        pages: [
          {
            sourceFilePath: "docs.html",
            sourceContentType: "html",
            route: "/docs",
            canonicalUrl: "https://example.com/docs",
            title: "Docs",
            description: undefined,
          },
          {
            sourceFilePath: "reference.html",
            sourceContentType: "html",
            route: "/reference",
            canonicalUrl: "https://example.com/docs",
            title: "Reference",
            description: undefined,
          },
        ],
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "SITE_VALIDATION_DUPLICATE_PAGE_CANONICAL_URL",
        message:
          "Page canonical URLs must be unique before generating OpenNav files.",
        context: {
          canonicalUrl: "https://example.com/docs",
          sourceFilePaths: ["docs.html", "reference.html"],
          mode: "loose",
        },
      });
    }
  });
});
