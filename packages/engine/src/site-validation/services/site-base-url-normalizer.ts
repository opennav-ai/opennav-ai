import { err, ok, type Result } from "neverthrow";
import type { OpenNavError } from "../../common/types/opennav-error";

const INVALID_BASE_URL_MESSAGE =
  "A valid absolute HTTP or HTTPS base URL is required before generating OpenNav files.";

/**
 * Prepares the configured site URL before engine classes build public URLs.
 */
export class SiteBaseUrlNormalizer {
  /**
   * Converts recoverable schemeless site URLs into absolute HTTPS base URLs.
   *
   * @param baseUrl - Raw site URL value supplied by the SDK, CLI, or framework wrapper.
   * @returns A normalized base URL with warnings, or a typed validation error.
   */
  public normalize(
    baseUrl: unknown,
  ): Result<
    { readonly baseUrl: string; readonly warnings: readonly OpenNavError[] },
    OpenNavError
  > {
    if (typeof baseUrl !== "string") {
      return err(this.createInvalidBaseUrlError(baseUrl));
    }

    const trimmedBaseUrl = baseUrl.trim();

    if (trimmedBaseUrl === "") {
      return err(this.createInvalidBaseUrlError(baseUrl));
    }

    const normalizedBaseUrl = this.hasExplicitProtocol(trimmedBaseUrl)
      ? trimmedBaseUrl
      : `https://${trimmedBaseUrl}`;

    if (!this.isValidHttpBaseUrl(normalizedBaseUrl)) {
      return err(this.createInvalidBaseUrlError(baseUrl));
    }

    if (normalizedBaseUrl === trimmedBaseUrl) {
      return ok({
        baseUrl: normalizedBaseUrl,
        warnings: [],
      });
    }

    return ok({
      baseUrl: normalizedBaseUrl,
      warnings: [
        {
          code: "SITE_URL_PROTOCOL_ADDED",
          message: "OpenNav added https:// to the configured siteUrl.",
          context: {
            originalBaseUrl: trimmedBaseUrl,
            normalizedBaseUrl,
          },
        },
      ],
    });
  }

  private createInvalidBaseUrlError(baseUrl: unknown): OpenNavError {
    return {
      code: "SITE_VALIDATION_BASE_URL_INVALID",
      message: INVALID_BASE_URL_MESSAGE,
      context: {
        baseUrl,
      },
    };
  }

  private hasExplicitProtocol(value: string): boolean {
    return /^[A-Za-z][A-Za-z\d+.-]*:\/\//u.test(value);
  }

  private isValidHttpBaseUrl(value: string): boolean {
    if (!URL.canParse(value)) {
      return false;
    }

    const url = new URL(value);
    const hostname = url.hostname;

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (hostname === "localhost" ||
        hostname.includes(".") ||
        hostname.includes(":"))
    );
  }
}
