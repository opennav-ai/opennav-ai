import { describe, expect, it } from "vitest";
import { OpenNavServer } from "./server";

function createHtmlResponse(body: string): Response {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const HTML_BODY =
  '<!doctype html><html lang="en"><head><title>Home</title></head><body><main><h1>Home</h1><p>Welcome to the site.</p></main></body></html>';

describe("OpenNavServer", (): void => {
  function createRequest(acceptHeader: string | null): Request {
    const headers = new Headers();

    if (acceptHeader !== null) {
      headers.set("accept", acceptHeader);
    }

    return new Request("https://example.com/", {
      headers,
      method: "GET",
    });
  }

  describe("negotiate", (): void => {
    it("returns Markdown when Accept: text/markdown is sent", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/markdown"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value;

      expect(response.headers.get("Content-Type")).toEqual(
        "text/markdown; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(await response.text()).toEqual("# Home\n\nWelcome to the site.\n");
    });

    it("returns HTML when no Accept header is sent", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest(null),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value;

      expect(response.headers.get("Content-Type")).toEqual(
        "text/html; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(response.headers.get("Link")).toEqual(
        '</>; rel="alternate"; type="text/markdown"',
      );
      expect(await response.text()).toEqual(HTML_BODY);
    });

    it("returns 406 when the client rejects all available types", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("application/pdf"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value;

      expect(response.status).toEqual(406);
      expect(response.headers.get("Content-Type")).toEqual(
        "text/plain; charset=utf-8",
      );
      expect(response.headers.get("Vary")).toEqual("Accept");
      expect(await response.text()).toEqual(
        "Not Acceptable\n\nAvailable: text/html, text/markdown\n",
      );
    });

    it("returns HTML when Accept: text/markdown;q=0, text/html is sent", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/markdown;q=0, text/html"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      const response = result.value;

      expect(response.headers.get("Content-Type")).toEqual(
        "text/html; charset=utf-8",
      );
      expect(await response.text()).toEqual(HTML_BODY);
    });

    it("returns Markdown when Accept: text/markdown, text/html is sent (client-order tiebreak picks markdown)", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/markdown, text/html"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.headers.get("Content-Type")).toEqual(
        "text/markdown; charset=utf-8",
      );
    });

    it("returns HTML when Accept: text/html, text/markdown is sent (client-order tiebreak picks html)", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/html, text/markdown"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.headers.get("Content-Type")).toEqual(
        "text/html; charset=utf-8",
      );
    });

    it("adds Link rel=alternate header on HTML responses", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: new Request("https://example.com/docs/", {
          headers: new Headers({ accept: "text/html" }),
        }),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.headers.get("Link")).toEqual(
        '</docs/>; rel="alternate"; type="text/markdown"',
      );
    });

    it("does not add Link header on Markdown responses", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/markdown"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.headers.get("Link")).toBeNull();
    });

    it("returns 406 when Accept has q=0 rejection for all types", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: createRequest("text/html;q=0, text/markdown;q=0"),
        htmlResponse: createHtmlResponse(HTML_BODY),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(result.value.status).toEqual(406);
    });

    it("strips layout from HTML when contentExtraction.stripLayout is enabled", async (): Promise<void> => {
      const server = new OpenNavServer({
        contentExtraction: { stripLayout: true },
      });

      const htmlWithNav =
        '<!doctype html><html lang="en"><head><title>Test</title></head><body><nav>Skip</nav><main><h1>Test</h1><p>Content.</p></main></body></html>';

      const result = await server.negotiate({
        request: createRequest("text/markdown"),
        htmlResponse: createHtmlResponse(htmlWithNav),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(await result.value.text()).toEqual("# Test\n\nContent.\n");
    });

    it("derives page metadata from request URL", async (): Promise<void> => {
      const server = new OpenNavServer();
      const result = await server.negotiate({
        request: new Request("https://docs.example.com/guide/", {
          headers: new Headers({ accept: "text/markdown" }),
        }),
        htmlResponse: createHtmlResponse(
          "<!doctype html><html><body><h1>Guide</h1><p>Welcome.</p></body></html>",
        ),
      });

      expect(result.isOk()).toEqual(true);

      if (result.isErr()) {
        throw new Error("Expected ok result");
      }

      expect(await result.value.text()).toEqual("# Guide\n\nWelcome.\n");
    });
  });
});
