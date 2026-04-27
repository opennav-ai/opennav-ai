import type { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { LlmsFullTxtGenerateResult } from "../types/llms-full-txt-generate-result";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";

class StaticLlmsFullTxtTokenCounter implements LlmsFullTxtTokenCounter {
  readonly #tokenCount: number;

  /**
   * Creates a test counter that always reports one configured token count.
   *
   * @param tokenCount - Token count returned for every content string.
   */
  public constructor(tokenCount: number) {
    this.#tokenCount = tokenCount;
  }

  /**
   * Returns the configured token count for any complete file content.
   *
   * @param content - Complete `llms-full.txt` content supplied by the generator.
   * @returns The configured token count.
   */
  public count(content: string): number {
    void content;

    return this.#tokenCount;
  }
}

class WhitespaceLlmsFullTxtTokenCounter implements LlmsFullTxtTokenCounter {
  /**
   * Counts whitespace-separated test tokens in complete file content.
   *
   * @param content - Complete `llms-full.txt` content supplied by the generator.
   * @returns Number of whitespace-separated tokens.
   */
  public count(content: string): number {
    const trimmedContent = content.trim();

    if (trimmedContent === "") {
      return 0;
    }

    return trimmedContent.split(/\s+/u).length;
  }
}

describe("LlmsFullTxtGenerator", (): void => {
  it("generates exact llms-full.txt content for Markdown and converted HTML page bodies", (): void => {
    const generator = new LlmsFullTxtGenerator(
      new StaticLlmsFullTxtTokenCounter(100),
    );

    const result: Result<LlmsFullTxtGenerateResult, OpenNavError> =
      generator.generate({
        siteName: "Example Docs",
        siteDescription:
          "Documentation for making static sites readable by agents.",
        baseUrl: "https://example.com",
        maxContentTokens: 10_000,
        pages: [
          {
            page: {
              sourceFilePath: "docs/cli/options.md",
              sourceContentType: "markdown",
              route: "/docs/cli/options",
              canonicalUrl: "https://example.com/docs/cli/options",
              title: "CLI Options",
              description: "Configure OpenNav AI from the command line.",
            },
            markdownContent:
              "# CLI Options\n\nConfigure OpenNav AI from the command line.\n\n- `--dry-run` previews generated files.\n- `--full-run` enables bulk operations.\n",
          },
          {
            page: {
              sourceFilePath: "index.html",
              sourceContentType: "html",
              route: "/",
              canonicalUrl: "https://example.com/",
              title: "Home",
              description: "Project overview and entry point.",
            },
            markdownContent:
              "# Home\n\nOpenNav AI creates files agents can read directly after a static site build.\n\n## Quick Start\n\nRun the CLI against `dist` and review the generated Markdown endpoints.\n",
          },
          {
            page: {
              sourceFilePath: "docs/api.html",
              sourceContentType: "html",
              route: "/docs/api",
              canonicalUrl: "https://example.com/docs/api",
              title: "API Reference",
              description: "Use the engine from TypeScript.",
            },
            markdownContent:
              "# API Reference\n\nUse the [Engine](https://example.com/docs/api/engine) class from TypeScript.\n\n```txt\nnpm install @opennav-ai/engine\n```\n",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: "llms-full.txt",
        content:
          "# Example Docs\n\n> Documentation for making static sites readable by agents.\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\nProject overview and entry point.\n\n# Home\n\nOpenNav AI creates files agents can read directly after a static site build.\n\n## Quick Start\n\nRun the CLI against `dist` and review the generated Markdown endpoints.\n\n---\n\n## Docs\n\n### API Reference\n\nURL: https://example.com/docs/api.md\n\nUse the engine from TypeScript.\n\n# API Reference\n\nUse the [Engine](https://example.com/docs/api/engine) class from TypeScript.\n\n```txt\nnpm install @opennav-ai/engine\n```\n\n---\n\n## Docs / CLI\n\n### CLI Options\n\nURL: https://example.com/docs/cli/options.md\n\nConfigure OpenNav AI from the command line.\n\n# CLI Options\n\nConfigure OpenNav AI from the command line.\n\n- `--dry-run` previews generated files.\n- `--full-run` enables bulk operations.\n",
        skippedFilePaths: [],
        warnings: [],
      });
    }
  });

  it("skips llms-full.txt with an exact warning when the configured token limit is exceeded", (): void => {
    const tokenCounter = new WhitespaceLlmsFullTxtTokenCounter();
    const generator = new LlmsFullTxtGenerator(tokenCounter);
    const completeContent =
      "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\n# Home\n\nHello agents.\n";
    const actualContentTokens = tokenCounter.count(completeContent);
    const maxContentTokens = actualContentTokens - 1;

    const result: Result<LlmsFullTxtGenerateResult, OpenNavError> =
      generator.generate({
        siteName: "Example Docs",
        baseUrl: "https://example.com",
        maxContentTokens,
        pages: [
          {
            page: {
              sourceFilePath: "index.html",
              sourceContentType: "html",
              route: "/",
              canonicalUrl: "https://example.com/",
              title: "Home",
              description: undefined,
            },
            markdownContent: "# Home\n\nHello agents.\n",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        outputFilePath: undefined,
        content: undefined,
        skippedFilePaths: ["llms-full.txt"],
        warnings: [
          {
            code: "LLMS_FULL_TXT_TOKEN_LIMIT_EXCEEDED",
            message:
              "The generated llms-full.txt file exceeded the configured token limit.",
            context: {
              outputFilePath: "llms-full.txt",
              maxContentTokens,
              actualContentTokens,
            },
          },
        ],
      });
    }
  });
});
