import { describe, expect, it } from "vitest";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import type { ResourceLinkBuildResult } from "../types/resource-link-build-result";
import { ResourceLinkBuilder } from "./resource-link-builder";

function createHtmlPage(
  sourceFilePath: string,
  route: string,
  canonicalUrl: string,
): OpenNavPage {
  return {
    sourceFilePath,
    sourceContentType: "html",
    route,
    canonicalUrl,
    title: "API",
    description: "Use the API.",
  };
}

function createMarkdownPage(): OpenNavPage {
  return {
    sourceFilePath: "docs/guide.md",
    sourceContentType: "markdown",
    route: "/docs/guide",
    canonicalUrl: "https://example.com/docs/guide",
    title: "Guide",
    description: "Read the guide.",
  };
}

describe("ResourceLinkBuilder", (): void => {
  it("returns exact page edits for HTML page resource links", (): void => {
    const builder = new ResourceLinkBuilder();

    const result: ResourceLinkBuildResult = builder.build({
      baseUrl: "https://example.com",
      pages: [
        {
          page: createHtmlPage(
            "docs/api/index.html",
            "/docs/api/",
            "https://example.com/docs/api/",
          ),
          sourceContent:
            "<html><head><title>API</title></head><body><h1>API</h1></body></html>",
        },
        {
          page: createMarkdownPage(),
          sourceContent: "# Guide\n",
        },
      ],
    });

    expect(result).toEqual({
      pageEdits: [
        {
          sourceFilePath: "docs/api/index.html",
          headInsertionOffset: 12,
          links: [
            {
              relation: "alternate",
              mediaType: "text/markdown",
              href: "https://example.com/docs/api/index.md",
            },
            {
              relation: "index",
              mediaType: "text/plain",
              href: "https://example.com/llms.txt",
              title: "LLMs text site index",
            },
          ],
          headLinkMarkup:
            '\n  <link rel="alternate" type="text/markdown" href="https://example.com/docs/api/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n',
        },
      ],
      warnings: [],
    });
  });

  it("returns exact warning when HTML head insertion is unavailable", (): void => {
    const builder = new ResourceLinkBuilder();

    const result: ResourceLinkBuildResult = builder.build({
      baseUrl: "https://example.com/docs/",
      pages: [
        {
          page: createHtmlPage(
            "api.html",
            "/api",
            "https://example.com/docs/api",
          ),
          sourceContent: "<main><h1>API</h1></main>",
        },
      ],
    });

    expect(result).toEqual({
      pageEdits: [],
      warnings: [
        {
          code: "RESOURCE_LINK_HTML_HEAD_MISSING",
          message:
            "HTML page does not have a source <head> element for safe resource link insertion.",
          context: {
            sourceFilePath: "api.html",
          },
        },
      ],
    });
  });
});
