import { ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "../constants/default-llms-full-max-content-tokens";
import type { AgentContentBuildInput } from "../types/agent-content-build-input";
import type { AgentContentBuildPage } from "../types/agent-content-build-page";
import type { AgentContentBuildResult } from "../types/agent-content-build-result";
import type { AgentContentFile } from "../types/agent-content-file";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";
import { AgentContentFileBuilder } from "./agent-content-file-builder";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";

interface SourcePageProbe {
  readonly buildPage: AgentContentBuildPage;
  readonly readCount: () => number;
}

class StaticLlmsFullTxtTokenCounter implements LlmsFullTxtTokenCounter {
  /**
   * Returns a small token count for any generated `llms-full.txt` body.
   *
   * @param content - Complete `llms-full.txt` content supplied by the generator.
   * @returns The same low token count so builder tests do not cap content.
   */
  public count(content: string): number {
    void content;

    return 1;
  }
}

class WhitespaceLlmsFullTxtTokenCounter implements LlmsFullTxtTokenCounter {
  /**
   * Counts whitespace-separated tokens in generated test content.
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

function createBuildInput(
  pages: readonly AgentContentBuildPage[],
  maxLlmsFullContentTokens: number = DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
): AgentContentBuildInput {
  return {
    siteName: "Example Docs",
    baseUrl: "https://example.com",
    maxLlmsFullContentTokens,
    pages,
  };
}

function createHtmlPage(
  sourceFilePath: string,
  route: string,
  title: string,
  description: string | undefined,
): OpenNavPage {
  return {
    sourceFilePath,
    sourceContentType: "html",
    route,
    canonicalUrl: `https://example.com${route}`,
    title,
    description,
  };
}

function createMarkdownPage(
  sourceFilePath: string,
  route: string,
  title: string,
  description: string | undefined,
): OpenNavPage {
  return {
    sourceFilePath,
    sourceContentType: "markdown",
    route,
    canonicalUrl: `https://example.com${route}`,
    title,
    description,
  };
}

function createSourcePageProbe(
  page: OpenNavPage,
  sourceContent: string,
): SourcePageProbe {
  let readCount = 0;

  return {
    buildPage: {
      page,
      getSourceContent: async (): Promise<Result<string, OpenNavError>> => {
        readCount += 1;

        return ok(sourceContent);
      },
    },
    readCount: (): number => readCount,
  };
}

function findFileByPath(
  files: readonly AgentContentFile[],
  outputFilePath: string,
): AgentContentFile {
  const file = files.find(
    (candidate: AgentContentFile): boolean =>
      candidate.outputFilePath === outputFilePath,
  );

  if (file === undefined) {
    throw new Error(`Expected generated file ${outputFilePath}`);
  }

  return file;
}

function getFilePaths(files: readonly AgentContentFile[]): readonly string[] {
  return files.map((file: AgentContentFile): string => file.outputFilePath);
}

describe("AgentContentFileBuilder", (): void => {
  it("returns exact priority-ordered file paths for a small site without reading page bodies", (): void => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("index.html", "/", "Home", "Project overview."),
      "<h1>Home</h1><p>Project overview.</p>",
    );
    const apiProbe = createSourcePageProbe(
      createHtmlPage("docs/api.html", "/docs/api", "API", "Use the API."),
      "<h1>API</h1><p>Use the API.</p>",
    );
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result: AgentContentBuildResult = builder.build(
      createBuildInput([homeProbe.buildPage, apiProbe.buildPage]),
    );

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        home: homeProbe.readCount(),
        api: apiProbe.readCount(),
      },
    }).toEqual({
      filePaths: ["llms.txt", "index.md", "docs/api.md", "llms-full.txt"],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        home: 0,
        api: 0,
      },
    });
  });

  it("does not plan a generated Markdown file when that Markdown path already exists", (): void => {
    const htmlProbe = createSourcePageProbe(
      createHtmlPage("docs/api.html", "/docs/api-html", "HTML API", undefined),
      "<h1>HTML API</h1><p>Generated from HTML.</p>",
    );
    const markdownProbe = createSourcePageProbe(
      createMarkdownPage(
        "docs/api.md",
        "/docs/api-markdown",
        "Markdown API",
        undefined,
      ),
      "# Markdown API\n\nGenerated from Markdown.\n",
    );
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput([htmlProbe.buildPage, markdownProbe.buildPage]),
    );

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        html: htmlProbe.readCount(),
        markdown: markdownProbe.readCount(),
      },
    }).toEqual({
      filePaths: ["llms.txt", "llms-full.txt"],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        html: 0,
        markdown: 0,
      },
    });
  });

  it("generates only the requested Markdown page body when one page file is read", async (): Promise<void> => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("index.html", "/", "Home", "Project overview."),
      "<h1>Home</h1><p>Project overview.</p>",
    );
    const apiProbe = createSourcePageProbe(
      createHtmlPage("docs/api.html", "/docs/api", "API", "Use the API."),
      '<h1>API</h1><p>Use the <a href="/docs/guide">guide</a>.</p>',
    );
    const guideProbe = createSourcePageProbe(
      createHtmlPage(
        "docs/guide.html",
        "/docs/guide",
        "Guide",
        "Read the guide.",
      ),
      "<h1>Guide</h1><p>Read the guide.</p>",
    );
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput([
        homeProbe.buildPage,
        apiProbe.buildPage,
        guideProbe.buildPage,
      ]),
    );
    const apiFile = findFileByPath(result.files, "docs/api.md");

    const contentResult = await apiFile.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect({
        fileContent: contentResult.value,
        sourceReadCounts: {
          home: homeProbe.readCount(),
          api: apiProbe.readCount(),
          guide: guideProbe.readCount(),
        },
      }).toEqual({
        fileContent: {
          content:
            "# API\n\nUse the [guide](https://example.com/docs/guide.md).\n",
          warnings: [],
        },
        sourceReadCounts: {
          home: 0,
          api: 1,
          guide: 0,
        },
      });
    }
  });

  it("does not create a route-based index.md file for a non-index root HTML file", (): void => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("home.html", "/", "Home", "Home page."),
      "<h1>Home</h1><p>Home page.</p>",
    );
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result = builder.build(createBuildInput([homeProbe.buildPage]));

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        home: homeProbe.readCount(),
      },
    }).toEqual({
      filePaths: ["llms.txt", "home.md", "llms-full.txt"],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        home: 0,
      },
    });
  });

  it("returns llms-full token cap warnings from the lazy content callback", async (): Promise<void> => {
    const tokenCounter = new WhitespaceLlmsFullTxtTokenCounter();
    const homeProbe = createSourcePageProbe(
      createHtmlPage("index.html", "/", "Home", undefined),
      "<h1>Home</h1><p>Hello agents.</p>",
    );
    const apiProbe = createSourcePageProbe(
      createHtmlPage("docs/api.html", "/docs/api", "API", undefined),
      "<h1>API</h1><p>Use the engine.</p>",
    );
    const cappedContent =
      "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\n# Home\n\nHello agents.\n";
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(tokenCounter),
    });
    const result = builder.build(
      createBuildInput(
        [homeProbe.buildPage, apiProbe.buildPage],
        tokenCounter.count(cappedContent),
      ),
    );
    const llmsFullFile = findFileByPath(result.files, "llms-full.txt");

    const contentResult = await llmsFullFile.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect(contentResult.value).toEqual({
        content: cappedContent,
        warnings: [
          {
            code: "LLMS_FULL_TXT_TOKEN_LIMIT_REACHED",
            message:
              "The generated llms-full.txt file stopped before adding content that would exceed the configured token limit.",
            context: {
              outputFilePath: "llms-full.txt",
              maxContentTokens: tokenCounter.count(cappedContent),
              actualContentTokens: tokenCounter.count(cappedContent),
              omittedPageCount: 1,
              omittedPageSourceFilePaths: ["docs/api.html"],
            },
          },
        ],
      });
    }
  });
});
