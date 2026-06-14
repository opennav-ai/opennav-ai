import { describe, expect, it } from "vitest";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import { HtmlResponseMarkdownNegotiator } from "./html-response-markdown-negotiator";

function createHtmlResponse(
  body: string,
  extraHeaders?: Readonly<Record<string, string>>,
): Response {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    ...extraHeaders,
  });

  return new Response(body, { headers });
}

function createPage(
  route: string,
  canonicalUrl: string,
  title: string,
): OpenNavPageMetadata {
  return {
    sourceFilePath: "index.html" as OpenNavPageMetadata["sourceFilePath"],
    sourceContentType: "html",
    route,
    canonicalUrl,
    title,
    description: undefined,
  };
}

const homePage = createPage("/", "https://example.com/", "Home");
const pages: readonly OpenNavPageMetadata[] = [homePage];

const HTML_BODY =
  '<!doctype html><html lang="en"><head><title>Home</title></head><body><main><h1>Home</h1><p>Welcome.</p></main></body></html>';

describe("HtmlResponseMarkdownNegotiator", (): void => {
  const baseUrl = "https://example.com";
  const negotiator = new HtmlResponseMarkdownNegotiator();

  describe("negotiate", (): void => {
    it("converts HTML to Markdown when decision is text/markdown", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY),
        decision: "text/markdown",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value.response;

      expect(response.headers.get("Content-Type")).toEqual(
        "text/markdown; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(await response.text()).toEqual("# Home\n\nWelcome.\n");
    });

    it("returns HTML response as-is when decision is text/html", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY),
        decision: "text/html",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value.response;

      expect(response.headers.get("Content-Type")).toEqual(
        "text/html; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(await response.text()).toEqual(HTML_BODY);
    });

    it("returns 406 when decision is null", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY),
        decision: null,
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value.response;

      expect(response.status).toEqual(406);
      expect(response.headers.get("Content-Type")).toEqual(
        "text/plain; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(await response.text()).toEqual(
        "Not Acceptable\n\nAvailable: text/html, text/markdown\n",
      );
    });

    it("appends Accept to existing Vary header on HTML pass-through", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY, {
          Vary: "Accept-Encoding",
        }),
        decision: "text/html",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.response.headers.get("Vary")).toEqual(
        "Accept-Encoding, Accept",
      );
    });

    it("does not duplicate Accept in Vary when already present on HTML pass-through", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY, {
          Vary: "Accept",
        }),
        decision: "text/html",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.response.headers.get("Vary")).toEqual("Accept");
    });

    it("preserves original HTML response status and headers on pass-through", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(HTML_BODY, {
          "Cache-Control": "max-age=60",
        }),
        decision: "text/html",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value.response;

      expect(response.headers.get("Cache-Control")).toEqual("max-age=60");
      expect(response.status).toEqual(200);
    });

    it("converts simple HTML paragraph to Markdown", async (): Promise<void> => {
      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(
          "<!doctype html><html><body><p>Hello world.</p></body></html>",
        ),
        decision: "text/markdown",
        page: homePage,
        pages,
        baseUrl,
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(await result.value.response.text()).toEqual("Hello world.\n");
    });

    it("strips layout when contentExtraction.stripLayout is enabled", async (): Promise<void> => {
      const htmlWithNav =
        '<!doctype html><html><head><title>Test</title></head><body><nav><a href="/">Home</a></nav><main><h1>Test</h1><p>Content.</p></main></body></html>';

      const result = await negotiator.negotiate({
        htmlResponse: createHtmlResponse(htmlWithNav),
        decision: "text/markdown",
        page: homePage,
        pages,
        baseUrl,
        contentExtraction: { stripLayout: true },
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(await result.value.response.text()).toEqual(
        "# Test\n\nContent.\n",
      );
    });
  });
});
