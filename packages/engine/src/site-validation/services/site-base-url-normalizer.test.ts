import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import { SiteBaseUrlNormalizer } from "./site-base-url-normalizer";

const INVALID_BASE_URL_MESSAGE =
  "A valid absolute HTTP or HTTPS base URL is required before generating OpenNav files.";
const PROTOCOL_ADDED_MESSAGE =
  "OpenNav added https:// to the configured siteUrl.";

type NormalizeResult = ReturnType<SiteBaseUrlNormalizer["normalize"]>;

describe("SiteBaseUrlNormalizer", (): void => {
  it("preserves absolute HTTP and HTTPS base URLs without warnings", (): void => {
    const normalizer = new SiteBaseUrlNormalizer();

    expect([
      readSuccess(normalizer.normalize("https://example.com")),
      readSuccess(normalizer.normalize("http://localhost:3000")),
    ]).toEqual([
      {
        baseUrl: "https://example.com",
        warnings: [],
      },
      {
        baseUrl: "http://localhost:3000",
        warnings: [],
      },
    ]);
  });

  it("adds HTTPS to schemeless domain base URLs with exact warnings", (): void => {
    const normalizer = new SiteBaseUrlNormalizer();

    expect([
      readSuccess(normalizer.normalize("example.com")),
      readSuccess(normalizer.normalize("example.com/docs")),
    ]).toEqual([
      {
        baseUrl: "https://example.com",
        warnings: [
          createProtocolAddedWarning("example.com", "https://example.com"),
        ],
      },
      {
        baseUrl: "https://example.com/docs",
        warnings: [
          createProtocolAddedWarning(
            "example.com/docs",
            "https://example.com/docs",
          ),
        ],
      },
    ]);
  });

  it("returns exact failures for blank, unsupported, and unsafe URL values", (): void => {
    const normalizer = new SiteBaseUrlNormalizer();

    expect([
      readFailure(normalizer.normalize("   ")),
      readFailure(normalizer.normalize("ftp://example.com")),
      readFailure(normalizer.normalize("not-a-url")),
    ]).toEqual([
      createInvalidBaseUrlError("   "),
      createInvalidBaseUrlError("ftp://example.com"),
      createInvalidBaseUrlError("not-a-url"),
    ]);
  });
});

function createInvalidBaseUrlError(baseUrl: string): OpenNavError {
  return {
    code: "SITE_VALIDATION_BASE_URL_INVALID",
    message: INVALID_BASE_URL_MESSAGE,
    context: {
      baseUrl,
    },
  };
}

function createProtocolAddedWarning(
  originalBaseUrl: string,
  normalizedBaseUrl: string,
): OpenNavError {
  return {
    code: "SITE_URL_PROTOCOL_ADDED",
    message: PROTOCOL_ADDED_MESSAGE,
    context: {
      originalBaseUrl,
      normalizedBaseUrl,
    },
  };
}

function readFailure(result: NormalizeResult): OpenNavError {
  if (result.isOk()) {
    throw new Error("Expected base URL normalization to fail.");
  }

  return result.error;
}

function readSuccess(result: NormalizeResult): {
  readonly baseUrl: string;
  readonly warnings: readonly OpenNavError[];
} {
  if (result.isErr()) {
    throw new Error("Expected base URL normalization to succeed.");
  }

  return result.value;
}
