import type { OpenNavContentExtractionOptions } from "./open-nav-content-extraction";

/**
 * Settings for the runtime OpenNav Server content negotiator.
 */
export interface OpenNavServerOptions {
  /**
   * Content types the server can produce, in priority order. The
   * first entry is the default when no Accept header is present.
   * Defaults to `["text/html", "text/markdown"]`.
   */
  readonly produces?: readonly string[] | undefined;

  /**
   * Optional HTML content extraction preferences such as layout
   * stripping before Markdown conversion.
   */
  readonly contentExtraction?: OpenNavContentExtractionOptions | undefined;
}

/**
 * Input for a single page content negotiation.
 */
export interface OpenNavServerNegotiateInput {
  /**
   * The incoming HTTP request. The Accept header is read from this
   * object to decide the preferred content type.
   */
  readonly request: Request;

  /**
   * The HTML response that the server would normally return for this
   * page. When the client prefers Markdown, the response body is
   * converted from HTML to Markdown before responding.
   */
  readonly htmlResponse: Response;
}
