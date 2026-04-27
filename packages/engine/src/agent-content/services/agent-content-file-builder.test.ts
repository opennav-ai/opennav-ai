import { ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPage } from "../../pages/types/opennav-page";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "../constants/default-llms-full-max-content-tokens";
import type { AgentContentBuildInput } from "../types/agent-content-build-input";
import type { AgentContentBuildPage } from "../types/agent-content-build-page";
import type { AgentContentBuildResult } from "../types/agent-content-build-result";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileContent } from "../types/agent-content-file-content";
import type { IndexMdFallbackGenerateInput } from "../types/index-md-fallback-generate-input";
import type { IndexMdFallbackGenerateResult } from "../types/index-md-fallback-generate-result";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";
import { AgentContentFileBuilder } from "./agent-content-file-builder";
import { IndexMdFallbackGenerator } from "./index-md-fallback-generator";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";

interface SourcePageProbe {
  readonly buildPage: AgentContentBuildPage;
  readonly readCount: () => number;
}

class CountingIndexMdFallbackGenerator extends IndexMdFallbackGenerator {
  public generateCallCount = 0;

  /**
   * Counts fallback generation calls before delegating to the real generator.
   *
   * @param input - Fallback support flag, root page metadata, and generated Markdown body.
   * @returns Generated fallback content or an empty optional result.
   */
  public override generate(
    input: IndexMdFallbackGenerateInput,
  ): Result<IndexMdFallbackGenerateResult, OpenNavError> {
    this.generateCallCount += 1;

    return super.generate(input);
  }
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
  generateIndexMdFallback: boolean,
  maxLlmsFullContentTokens: number = DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
): AgentContentBuildInput {
  return {
    siteName: "Example Docs",
    baseUrl: "https://example.com",
    maxLlmsFullContentTokens,
    generateIndexMdFallback,
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

async function readGeneratedFiles(files: readonly AgentContentFile[]): Promise<
  readonly {
    readonly outputFilePath: string;
    readonly content: string;
    readonly warnings: readonly OpenNavError[];
  }[]
> {
  const generatedFiles: {
    readonly outputFilePath: string;
    readonly content: string;
    readonly warnings: readonly OpenNavError[];
  }[] = [];

  for (const file of files) {
    const contentResult: Result<AgentContentFileContent, OpenNavError> =
      await file.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      generatedFiles.push({
        outputFilePath: file.outputFilePath,
        content: contentResult.value.content,
        warnings: contentResult.value.warnings,
      });
    }
  }

  return generatedFiles;
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
      createBuildInput([homeProbe.buildPage, apiProbe.buildPage], false),
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

  it("keeps the first mirrored Markdown artifact when two pages claim the same output path", async (): Promise<void> => {
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
      createBuildInput([htmlProbe.buildPage, markdownProbe.buildPage], false),
    );
    const apiFile = findFileByPath(result.files, "docs/api.md");

    const contentResult = await apiFile.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect({
        filePaths: getFilePaths(result.files),
        fileContent: contentResult.value,
        sourceReadCounts: {
          html: htmlProbe.readCount(),
          markdown: markdownProbe.readCount(),
        },
      }).toEqual({
        filePaths: ["llms.txt", "docs/api.md", "llms-full.txt"],
        fileContent: {
          content: "# HTML API\n\nGenerated from HTML.\n",
          warnings: [],
        },
        sourceReadCounts: {
          html: 1,
          markdown: 0,
        },
      });
    }
  });

  it("generates only the requested Markdown page body when one page file is read", async (): Promise<void> => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("index.html", "/", "Home", "Project overview."),
      "<h1>Home</h1><p>Project overview.</p>",
    );
    const apiProbe = createSourcePageProbe(
      createHtmlPage("docs/api.html", "/docs/api", "API", "Use the API."),
      "<h1>API</h1><p>Use the API.</p>",
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
      createBuildInput(
        [homeProbe.buildPage, apiProbe.buildPage, guideProbe.buildPage],
        false,
      ),
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
          content: "# API\n\nUse the API.\n",
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

  it("keeps the root mirrored Markdown artifact when fallback would duplicate index.md", async (): Promise<void> => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("index.html", "/", "Home", "Home page."),
      "<h1>Home</h1><p>Home page.</p>",
    );
    const fallbackGenerator = new CountingIndexMdFallbackGenerator();
    const builder = new AgentContentFileBuilder({
      indexMdFallbackGenerator: fallbackGenerator,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result = builder.build(createBuildInput([homeProbe.buildPage], true));
    const generatedFiles = await readGeneratedFiles(result.files);

    expect({
      filePaths: getFilePaths(result.files),
      generatedFiles,
      fallbackGenerateCallCount: fallbackGenerator.generateCallCount,
    }).toEqual({
      filePaths: ["llms.txt", "index.md", "llms-full.txt"],
      generatedFiles: [
        {
          outputFilePath: "llms.txt",
          content:
            "# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Home page.\n",
          warnings: [],
        },
        {
          outputFilePath: "index.md",
          content: "# Home\n\nHome page.\n",
          warnings: [],
        },
        {
          outputFilePath: "llms-full.txt",
          content:
            "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\nHome page.\n\n# Home\n\nHome page.\n",
          warnings: [],
        },
      ],
      fallbackGenerateCallCount: 0,
    });
  });

  it("adds one enabled root index.md fallback when no higher-priority file claimed that path", async (): Promise<void> => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("home.html", "/", "Home", "Home page."),
      "<h1>Home</h1><p>Home page.</p>",
    );
    const fallbackGenerator = new CountingIndexMdFallbackGenerator();
    const builder = new AgentContentFileBuilder({
      indexMdFallbackGenerator: fallbackGenerator,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result = builder.build(createBuildInput([homeProbe.buildPage], true));
    const fallbackFile = findFileByPath(result.files, "index.md");
    const fallbackContentResult = await fallbackFile.getContent();

    expect(fallbackContentResult.isOk()).toEqual(true);
    if (fallbackContentResult.isOk()) {
      expect({
        filePaths: getFilePaths(result.files),
        fallbackContent: fallbackContentResult.value,
        fallbackGenerateCallCount: fallbackGenerator.generateCallCount,
      }).toEqual({
        filePaths: ["llms.txt", "home.md", "llms-full.txt", "index.md"],
        fallbackContent: {
          content: "# Home\n\nHome page.\n",
          warnings: [],
        },
        fallbackGenerateCallCount: 1,
      });
    }
  });

  it("does not add a fallback file when root index.md fallback generation is disabled", (): void => {
    const homeProbe = createSourcePageProbe(
      createHtmlPage("home.html", "/", "Home", "Home page."),
      "<h1>Home</h1><p>Home page.</p>",
    );
    const builder = new AgentContentFileBuilder({
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result = builder.build(
      createBuildInput([homeProbe.buildPage], false),
    );

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
        false,
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
