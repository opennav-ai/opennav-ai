import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import type { ResourceLinkPageEdit } from "../types/resource-link-page-edit";
import { HtmlHeadLinkPlanner } from "./html-head-link-planner";

const RESOURCE_LINK_FINGERPRINT = "sha256:0123456789ab";

function createHtmlPage(): OpenNavPageMetadata {
  return {
    sourceFilePath: "docs/api/index.html",
    sourceContentType: "html",
    route: "/docs/api/",
    canonicalUrl: "https://example.com/docs/api/",
    title: "API",
    description: "Use the API.",
  };
}

describe("HtmlHeadLinkPlanner", (): void => {
  it("plans exact head link insertion for an HTML page with a source head element", (): void => {
    const planner = new HtmlHeadLinkPlanner();

    const result: Result<ResourceLinkPageEdit, OpenNavError> = planner.plan({
      page: createHtmlPage(),
      resourceLinkFingerprint: RESOURCE_LINK_FINGERPRINT,
      sourceContent:
        "<html><head><title>API</title></head><body><h1>API</h1></body></html>",
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
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
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
          '\n  <link rel="alternate" type="text/markdown" href="https://example.com/docs/api/index.md" data-opennav="resource-link" data-opennav-sha="sha256:0123456789ab">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index" data-opennav="resource-link" data-opennav-sha="sha256:0123456789ab">',
      });
    }
  });

  it("returns an exact typed warning when an HTML page has no source head element", (): void => {
    const planner = new HtmlHeadLinkPlanner();

    const result: Result<ResourceLinkPageEdit, OpenNavError> = planner.plan({
      page: createHtmlPage(),
      resourceLinkFingerprint: RESOURCE_LINK_FINGERPRINT,
      sourceContent: "<main><h1>API</h1></main>",
      links: [
        {
          relation: "alternate",
          mediaType: "text/markdown",
          href: "https://example.com/docs/api/index.md",
        },
      ],
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "RESOURCE_LINK_HTML_HEAD_MISSING",
        message:
          "HTML page does not have a source <head> element for safe resource link insertion.",
        context: {
          sourceFilePath: "docs/api/index.html",
        },
      });
    }
  });
});
