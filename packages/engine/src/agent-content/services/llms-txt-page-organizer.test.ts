import { describe, expect, it } from "vitest";
import type { LlmsTxtPageOrganizeResult } from "../types/llms-txt-page-organize-result";
import { LlmsTxtPageOrganizer } from "./llms-txt-page-organizer";

describe("LlmsTxtPageOrganizer", (): void => {
  it("groups pages into exact llms.txt sections with Markdown artifact URLs", (): void => {
    const organizer = new LlmsTxtPageOrganizer();

    const result: LlmsTxtPageOrganizeResult = organizer.organize({
      baseUrl: "https://example.com",
      pages: [
        {
          sourceFilePath: "docs/getting-started/index.html",
          sourceContentType: "html",
          route: "/docs/getting-started/",
          canonicalUrl: "https://example.com/docs/getting-started/",
          title: "Getting Started",
          description: "Install and configure OpenNav AI.",
        },
        {
          sourceFilePath: "docs/cli/options.md",
          sourceContentType: "markdown",
          route: "/docs/cli/options",
          canonicalUrl: "https://example.com/docs/cli/options",
          title: "CLI Options",
          description: undefined,
        },
        {
          sourceFilePath: "index.html",
          sourceContentType: "html",
          route: "/",
          canonicalUrl: "https://example.com/",
          title: "Home",
          description: "Project overview and entry point.",
        },
        {
          sourceFilePath: "docs/api.html",
          sourceContentType: "html",
          route: "/docs/api",
          canonicalUrl: "https://example.com/docs/api",
          title: "API Reference",
          description: "Use the engine from TypeScript.",
        },
      ],
    });

    expect(result).toEqual({
      sections: [
        {
          heading: "Root",
          links: [
            {
              title: "Home",
              url: "https://example.com/index.md",
              description: "Project overview and entry point.",
            },
          ],
        },
        {
          heading: "Docs",
          links: [
            {
              title: "API Reference",
              url: "https://example.com/docs/api.md",
              description: "Use the engine from TypeScript.",
            },
            {
              title: "Getting Started",
              url: "https://example.com/docs/getting-started/index.md",
              description: "Install and configure OpenNav AI.",
            },
          ],
        },
        {
          heading: "Docs / CLI",
          links: [
            {
              title: "CLI Options",
              url: "https://example.com/docs/cli/options.md",
              description: undefined,
            },
          ],
        },
      ],
    });
  });
});
