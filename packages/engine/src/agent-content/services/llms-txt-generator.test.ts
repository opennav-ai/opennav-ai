import { describe, expect, it } from "vitest";
import type { LlmsTxtGenerateResult } from "../types/llms-txt-generate-result";
import { LlmsTxtGenerator } from "./llms-txt-generator";

describe("LlmsTxtGenerator", (): void => {
  it("generates exact llms.txt content with hierarchical Markdown artifact links", (): void => {
    const generator = new LlmsTxtGenerator();

    const result: LlmsTxtGenerateResult = generator.generate({
      siteName: "Example Docs",
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
      outputFilePath: "llms.txt",
      content:
        "# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Project overview and entry point.\n\n## Docs\n\n- [API Reference](https://example.com/docs/api.md): Use the engine from TypeScript.\n- [Getting Started](https://example.com/docs/getting-started/index.md): Install and configure OpenNav AI.\n\n## Docs / CLI\n\n- [CLI Options](https://example.com/docs/cli/options.md)\n",
    });
  });
});
