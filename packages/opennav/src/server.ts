import { err, ok, type Result } from "neverthrow";
import {
  type AcceptDecision,
  AcceptHeaderNegotiator,
} from "../../engine/src/accept/services/accept-header-negotiator";
import { HtmlResponseMarkdownNegotiator } from "../../engine/src/accept/services/html-response-markdown-negotiator";
import type { OpenNavError } from "../../engine/src/common/types/opennav-error.ts";
import type { OpenNavPageMetadata } from "../../engine/src/pages/types/opennav-page.ts";
import type { PageContentType } from "../../engine/src/pages/types/page-content-type.ts";
import type { OpenNavContentExtractionOptions } from "./types/open-nav-content-extraction.ts";
import type {
  OpenNavServerNegotiateInput,
  OpenNavServerOptions,
} from "./types/open-nav-server";

export {
  type AcceptDecision,
  AcceptHeaderNegotiator,
} from "../../engine/src/accept/services/accept-header-negotiator";
export type {
  OpenNavServerNegotiateInput,
  OpenNavServerOptions,
} from "./types/open-nav-server";

const DEFAULT_PRODUCES: readonly string[] = ["text/html", "text/markdown"];

/**
 * Runtime content negotiation for serving Markdown to AI agents from
 * the same URL that serves HTML to browsers.
 *
 * This is the server-side companion to `OpenNavStaticSite`. While the
 * static build generates `.md` files from a built output directory,
 * `OpenNavServer` does per-request HTML-to-Markdown conversion when
 * the client sends `Accept: text/markdown`.
 *
 * Three methods are available, ranging from simple to fine-grained:
 *
 * - `negotiate({ request, htmlResponse })` — full content negotiation
 *   pipeline: accept header → decision → appropriate response.
 * - `accept(request)` — parse the Accept header and return the content
 *   type decision. No I/O, no conversion.
 * - `toMarkdown({ request, htmlResponse })` — convert HTML to Markdown
 *   without inspecting the Accept header.
 *
 * Usage:
 *
 * ```ts
 * import { OpenNavServer } from "@opennav-ai/opennav/server";
 *
 * const opennav = new OpenNavServer();
 *
 * app.get("/docs/:slug", async (c) => {
 *   const htmlResponse = await renderPageAsHtml(c.req.param("slug"));
 *
 *   const result = await opennav.negotiate({
 *     request: c.req.raw,
 *     htmlResponse,
 *   });
 *
 *   if (result.isErr()) return c.text("Internal error", 500);
 *   return result.value;
 * });
 * ```
 */
export class OpenNavServer {
  readonly #acceptNegotiator: AcceptHeaderNegotiator;
  readonly #responseNegotiator: HtmlResponseMarkdownNegotiator;
  readonly #produces: readonly string[];
  readonly #contentExtraction: OpenNavContentExtractionOptions | undefined;

  /**
   * Creates a runtime OpenNav content negotiator.
   *
   * @param options - Content types to produce and optional extraction
   * preferences.
   */
  public constructor(options: OpenNavServerOptions = {}) {
    this.#acceptNegotiator = new AcceptHeaderNegotiator();
    this.#responseNegotiator = new HtmlResponseMarkdownNegotiator();
    this.#produces = options.produces ?? DEFAULT_PRODUCES;
    this.#contentExtraction = options.contentExtraction;
  }

  /**
   * Parses the request Accept header and returns the best content type
   * match from the configured produces list.
   *
   * No I/O or conversion is performed. Callers use this to branch before
   * fetching or rendering expensive page content — for example, to check
   * for a static `.md` file before falling back to runtime conversion.
   *
   * @param request - The incoming request.
   * @returns The winning content type, or `null` if no type in the
   * produces list is acceptable to the client.
   */
  public accept(request: Request): AcceptDecision {
    return this.#acceptNegotiator.negotiate({
      acceptHeader: request.headers.get("accept") ?? null,
      produces: this.#produces,
    });
  }

  /**
   * Converts the HTML response body to Markdown without inspecting the
   * Accept header.
   *
   * Use this when the caller already knows Markdown is needed — for
   * example, after a static `.md` file check failed and the fallback
   * HTML has been fetched.
   *
   * Page metadata (route, canonical URL, source path) is derived
   * automatically from the request URL.
   *
   * @param input - The incoming request and the server's HTML response
   * for this page.
   * @returns A Response with `Content-Type: text/markdown; charset=utf-8`
   * and `Vary: Accept`, or a typed OpenNav error if conversion fails.
   */
  public async toMarkdown(
    input: OpenNavServerNegotiateInput,
  ): Promise<Result<Response, OpenNavError>> {
    const page = this.toPageMetadata(input.request);

    const result = await this.#responseNegotiator.negotiate({
      htmlResponse: input.htmlResponse,
      decision: "text/markdown",
      page,
      pages: [page],
      baseUrl: "",
      contentExtraction: this.#contentExtraction,
    });

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.response);
  }

  /**
   * Inspects the request Accept header and returns the right Response
   * (HTML, Markdown, or 406) for a given page.
   *
   * This is the high-level entry point for most callers. It parses the
   * Accept header via `accept()`, then:
   *
   * - `text/markdown` → delegates to `toMarkdown()` for conversion
   * - `text/html` → passes through the original response with `Vary` and
   *   `Link: rel="alternate"` headers
   * - `null` (no match) → returns 406 Not Acceptable
   *
   * For callers that need fine-grained control over the decision or
   * conversion steps, use `accept()` and `toMarkdown()` directly.
   *
   * @param input - The incoming request and the server's HTML response
   * for this page.
   * @returns The negotiated Response or a typed OpenNav error.
   */
  public async negotiate(
    input: OpenNavServerNegotiateInput,
  ): Promise<Result<Response, OpenNavError>> {
    const decision = this.accept(input.request);

    if (decision === "text/markdown") {
      return this.toMarkdown(input);
    }

    const page = this.toPageMetadata(input.request);

    const result = await this.#responseNegotiator.negotiate({
      htmlResponse: input.htmlResponse,
      decision,
      page,
      pages: [page],
      baseUrl: "",
      contentExtraction: this.#contentExtraction,
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const response = result.value.response;

    if (decision === "text/html") {
      return ok(this.addAlternateLinkHeader(response, input));
    }

    return ok(response);
  }

  private addAlternateLinkHeader(
    response: Response,
    input: OpenNavServerNegotiateInput,
  ): Response {
    const url = new URL(input.request.url);
    const linkValue = `<${url.pathname}>; rel="alternate"; type="text/markdown"`;
    const headers = new Headers(response.headers);
    const existing = headers.get("Link") ?? headers.get("link");

    if (existing !== null) {
      headers.set("Link", `${existing}, ${linkValue}`);
    } else {
      headers.set("Link", linkValue);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  private toPageMetadata(request: Request): OpenNavPageMetadata {
    const url = new URL(request.url);
    const route = url.pathname || "/";
    const sourceFilePath = `${route.replace(/^\//, "").replace(/\/$/, "") || "index"}.html`;

    return {
      sourceFilePath,
      sourceContentType: "html" as PageContentType,
      route,
      canonicalUrl: `${url.origin}${route}`,
      title: undefined,
      description: undefined,
    };
  }
}
