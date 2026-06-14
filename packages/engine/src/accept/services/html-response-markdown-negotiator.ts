import { err, ok, type Result } from "neverthrow";
import { PageMarkdownContentGenerator } from "../../agent-content/services/page-markdown-content-generator";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { EngineContentExtractionOptions } from "../../types/engine-content-extraction-options";
import type { AcceptDecision } from "./accept-header-negotiator";

/**
 * Input required to negotiate an HTML response into Markdown when the
 * client prefers it via the Accept header.
 */
export interface HtmlResponseMarkdownNegotiateInput {
  /** The original HTML response returned by the server for this page. */
  readonly htmlResponse: Response;

  /** Negotiated content type decision from AcceptHeaderNegotiator. */
  readonly decision: AcceptDecision;

  /** Metadata-only page record for the page being converted. */
  readonly page: OpenNavPageMetadata;

  /** Validated metadata-only page records for the current site. Used
   * for link rewriting during HTML-to-Markdown conversion. */
  readonly pages: readonly OpenNavPageMetadata[];

  /** Public site root used to calculate Markdown link URLs. */
  readonly baseUrl: string;

  /** Optional HTML content extraction preferences such as layout
   * stripping. */
  readonly contentExtraction?: EngineContentExtractionOptions | undefined;
}

/**
 * Wraps a negotiated response with the final HTTP Response object.
 */
export interface HtmlResponseMarkdownNegotiateResult {
  /** The final Response to send to the client. */
  readonly response: Response;
}

/**
 * Converts an HTML response into a negotiated representation based
 * on the Accept header decision.
 *
 * When the client prefers Markdown, the HTML body is converted to
 * Markdown using turndown and returned with the appropriate Content-Type.
 * When the client prefers HTML, the response is passed through with
 * Vary: Accept appended. When no type is acceptable, a 406 is returned.
 */
export class HtmlResponseMarkdownNegotiator {
  readonly #contentGenerator: PageMarkdownContentGenerator;

  /**
   * Creates a response negotiator with the given content generator.
   *
   * @param contentGenerator - Converts HTML page bodies to Markdown.
   */
  public constructor(
    contentGenerator: PageMarkdownContentGenerator = new PageMarkdownContentGenerator(),
  ) {
    this.#contentGenerator = contentGenerator;
  }

  /**
   * Returns the appropriate Response based on the Accept negotiation
   * decision.
   *
   * @param input - The original HTML response, negotiation decision,
   * and page context needed for HTML-to-Markdown conversion.
   * @returns A Response with the negotiated body and headers, or a
   * typed OpenNav error if conversion fails.
   */
  public async negotiate(
    input: HtmlResponseMarkdownNegotiateInput,
  ): Promise<Result<HtmlResponseMarkdownNegotiateResult, OpenNavError>> {
    if (input.decision === null) {
      const response = new Response(
        "Not Acceptable\n\nAvailable: text/html, text/markdown\n",
        {
          status: 406,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
          },
        },
      );

      return ok({ response });
    }

    if (input.decision === "text/markdown") {
      return this.buildMarkdownResponse(input);
    }

    return this.buildHtmlResponse(input);
  }

  private async buildHtmlResponse(
    input: HtmlResponseMarkdownNegotiateInput,
  ): Promise<Result<HtmlResponseMarkdownNegotiateResult, OpenNavError>> {
    const response = new Response(input.htmlResponse.body, {
      status: input.htmlResponse.status,
      statusText: input.htmlResponse.statusText,
      headers: this.getPassThroughHeaders(input.htmlResponse.headers),
    });

    return ok({ response });
  }

  private async buildMarkdownResponse(
    input: HtmlResponseMarkdownNegotiateInput,
  ): Promise<Result<HtmlResponseMarkdownNegotiateResult, OpenNavError>> {
    const htmlBody = await input.htmlResponse.text();
    const markdownResult = this.#contentGenerator.generate({
      baseUrl: input.baseUrl,
      page: input.page,
      pages: input.pages,
      sourceContent: htmlBody,
      contentExtraction: input.contentExtraction,
    });

    if (markdownResult.isErr()) {
      return err(markdownResult.error);
    }

    const response = new Response(markdownResult.value.content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
      },
    });

    return ok({ response });
  }

  private getPassThroughHeaders(originalHeaders: Headers): Headers {
    const headers = new Headers();

    for (const [key, value] of originalHeaders.entries()) {
      headers.set(key, value);
    }

    headers.set("Vary", this.getVaryHeader(originalHeaders));

    return headers;
  }

  private getVaryHeader(headers: Headers): string {
    const existing = headers.get("Vary") ?? headers.get("vary");

    if (existing === null) {
      return "Accept";
    }

    const tokens: readonly string[] = existing
      .split(",")
      .map((s: string): string => s.trim().toLowerCase());

    if (tokens.includes("accept")) {
      return existing;
    }

    return `${existing}, Accept`;
  }
}
