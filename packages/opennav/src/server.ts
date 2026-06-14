import { err, ok, type Result } from "neverthrow";
import { type AcceptDecision, AcceptHeaderNegotiator } from "../../engine/src/accept/services/accept-header-negotiator";
import { HtmlResponseMarkdownNegotiator } from "../../engine/src/accept/services/html-response-markdown-negotiator";
import type { OpenNavError } from "../../engine/src/common/types/opennav-error.ts";
import type { OpenNavPageMetadata } from "../../engine/src/pages/types/opennav-page.ts";
import type { PageContentType } from "../../engine/src/pages/types/page-content-type.ts";
import type { OpenNavContentExtractionOptions } from "./types/open-nav-content-extraction.ts";
import type { OpenNavServerNegotiateInput, OpenNavServerOptions } from "./types/open-nav-server";

export { type AcceptDecision, AcceptHeaderNegotiator } from "../../engine/src/accept/services/accept-header-negotiator";
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
   * Inspects the request Accept header and returns the right Response
   * (HTML, Markdown, or 406) for a given page.
   *
   * Page metadata (route, canonical URL, source path) is derived
   * automatically from the request URL. No manual page records or
   * site page lists are needed.
   *
   * When the client prefers `text/markdown`, the HTML response body is
   * converted to Markdown on-the-fly. When the client prefers
   * `text/html`, the original response is passed through with a
   * `Vary: Accept` header and a `Link: rel="alternate"` header
   * advertising the Markdown representation.
   *
   * @param input - The incoming request and the server's HTML response
   * for this page.
   * @returns The negotiated Response or a typed OpenNav error.
   */
  public async negotiate(
    input: OpenNavServerNegotiateInput,
  ): Promise<Result<Response, OpenNavError>> {
    const decision: AcceptDecision = this.#acceptNegotiator.negotiate({
      acceptHeader: input.request.headers.get("accept") ?? null,
      produces: this.#produces,
    });

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
