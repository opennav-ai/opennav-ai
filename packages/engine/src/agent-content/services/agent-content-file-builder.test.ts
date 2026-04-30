import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import { EngineFileReader } from "../../input/services/engine-file-reader";
import type { EngineFileReadInput } from "../../input/types/engine-file-read-input";
import type { EngineFileReadResult } from "../../input/types/engine-file-read-result";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import { DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS } from "../constants/default-llms-full-max-content-tokens";
import type { AgentContentBuildInput } from "../types/agent-content-build-input";
import type { AgentContentBuildResult } from "../types/agent-content-build-result";
import type { AgentContentFile } from "../types/agent-content-file";
import type { LlmsFullTxtTokenCounter } from "../types/llms-full-txt-token-counter";
import { AgentContentFileBuilder } from "./agent-content-file-builder";
import { LlmsFullTxtGenerator } from "./llms-full-txt-generator";

const BUILD_FINGERPRINT = "sha256:build";
let fixtureDirectory: string | undefined;

class CountingEngineFileReader extends EngineFileReader {
  readonly #readCounts = new Map<string, number>();

  /**
   * Reads one source file through the real engine file reader and records the path.
   *
   * @param input - Output directory and source file path to read.
   * @returns The real file read result from disk.
   */
  public override async read(
    input: EngineFileReadInput,
  ): Promise<Result<EngineFileReadResult, OpenNavError>> {
    this.#readCounts.set(input.filePath, this.readCount(input.filePath) + 1);

    return super.read(input);
  }

  /**
   * Returns how many times a source file path has been read.
   *
   * @param filePath - Output-directory-relative source file path to inspect.
   * @returns The recorded read count for that exact path.
   */
  public readCount(filePath: string): number {
    return this.#readCounts.get(filePath) ?? 0;
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
  outputDirectory: string,
  pages: readonly OpenNavPageMetadata[],
  maxLlmsFullContentTokens: number = DEFAULT_LLMS_FULL_MAX_CONTENT_TOKENS,
  contentSignalsConfigured = false,
): AgentContentBuildInput {
  return {
    siteName: "Example Docs",
    baseUrl: "https://example.com",
    buildFingerprint: BUILD_FINGERPRINT,
    contentSignalsConfigured,
    maxLlmsFullContentTokens,
    outputDirectory,
    pages,
  };
}

function createHtmlPage(
  sourceFilePath: string,
  route: string,
  title: string,
  description: string | undefined,
): OpenNavPageMetadata {
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
): OpenNavPageMetadata {
  return {
    sourceFilePath,
    sourceContentType: "markdown",
    route,
    canonicalUrl: `https://example.com${route}`,
    title,
    description,
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

function appendExpectedBuildFingerprintMarker(content: string): string {
  return `${content}\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json" -->\n`;
}

function createExpectedOpenNavManifestContent(
  contentSignals: boolean,
  htmlResourceLinks: boolean,
): string {
  return `{\n  "opennav": true,\n  "version": "1.0",\n  "profile": "static-agent-ready",\n  "site": "https://example.com",\n  "build_fingerprint": "${BUILD_FINGERPRINT}",\n  "spec": "https://opennav.ai/spec/1.0",\n  "artifacts": {\n    "llms_txt": "/llms.txt",\n    "llms_full_txt": "/llms-full.txt",\n    "well_known_llms_txt": "/.well-known/llms.txt",\n    "well_known_llms_full_txt": "/.well-known/llms-full.txt"\n  },\n  "capabilities": {\n    "clean_markdown": true,\n    "llms_txt": true,\n    "llms_full_txt": true,\n    "html_resource_links": ${htmlResourceLinks ? "true" : "false"},\n    "content_signals": ${contentSignals ? "true" : "false"}\n  }\n}\n`;
}

async function createOutputDirectory(): Promise<string> {
  fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-agent-content-"));
  const outputDirectory = join(fixtureDirectory, "dist");
  await mkdir(outputDirectory);

  return outputDirectory;
}

function createReadError(
  outputDirectory: string,
  sourceFilePath: string,
): OpenNavError {
  return {
    code: "ENGINE_FILE_READ_FAILED",
    message: "The engine could not read the built site file.",
    context: {
      outputDirectory,
      filePath: sourceFilePath,
      cause: `ENOENT: no such file or directory, open '${join(
        outputDirectory,
        sourceFilePath,
      )}'`,
    },
  };
}

async function writeSourceFile(
  outputDirectory: string,
  page: OpenNavPageMetadata,
  sourceContent: string,
): Promise<void> {
  const absoluteFilePath = join(outputDirectory, page.sourceFilePath);
  await mkdir(dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, sourceContent, "utf8");
}

describe("AgentContentFileBuilder", (): void => {
  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact priority-ordered file paths for a small site without reading page bodies", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const homePage = createHtmlPage(
      "index.html",
      "/",
      "Home",
      "Project overview.",
    );
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      "Use the API.",
    );
    await writeSourceFile(
      outputDirectory,
      homePage,
      "<h1>Home</h1><p>Project overview.</p>",
    );
    await writeSourceFile(
      outputDirectory,
      apiPage,
      "<h1>API</h1><p>Use the API.</p>",
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result: AgentContentBuildResult = builder.build(
      createBuildInput(outputDirectory, [homePage, apiPage]),
    );

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        home: fileReader.readCount("index.html"),
        api: fileReader.readCount("docs/api.html"),
      },
    }).toEqual({
      filePaths: [
        "llms.txt",
        ".well-known/llms.txt",
        "index.md",
        "docs/api.md",
        "llms-full.txt",
        ".well-known/llms-full.txt",
        ".well-known/opennav.json",
      ],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        home: 0,
        api: 0,
      },
    });
  });

  it("builds exact lazy readable content files for a validated page set", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const homePage = createHtmlPage(
      "index.html",
      "/",
      "Home",
      "Project overview.",
    );
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      "Use the API.",
    );
    await writeSourceFile(
      outputDirectory,
      homePage,
      '<h1>Home</h1><p>Start with the <a href="/docs/api">API</a>.</p>',
    );
    await writeSourceFile(
      outputDirectory,
      apiPage,
      '<h1>API</h1><p>Use API features after reading <a href="/">Home</a>.</p>',
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result: AgentContentBuildResult = builder.build(
      createBuildInput(outputDirectory, [homePage, apiPage]),
    );

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        home: fileReader.readCount("index.html"),
        api: fileReader.readCount("docs/api.html"),
      },
    }).toEqual({
      filePaths: [
        "llms.txt",
        ".well-known/llms.txt",
        "index.md",
        "docs/api.md",
        "llms-full.txt",
        ".well-known/llms-full.txt",
        ".well-known/opennav.json",
      ],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        home: 0,
        api: 0,
      },
    });

    const llmsTxtContentResult = await findFileByPath(
      result.files,
      "llms.txt",
    ).getContent();
    const wellKnownLlmsTxtContentResult = await findFileByPath(
      result.files,
      ".well-known/llms.txt",
    ).getContent();
    const homeMarkdownContentResult = await findFileByPath(
      result.files,
      "index.md",
    ).getContent();
    const apiMarkdownContentResult = await findFileByPath(
      result.files,
      "docs/api.md",
    ).getContent();
    const llmsFullTxtContentResult = await findFileByPath(
      result.files,
      "llms-full.txt",
    ).getContent();
    const wellKnownLlmsFullTxtContentResult = await findFileByPath(
      result.files,
      ".well-known/llms-full.txt",
    ).getContent();
    const openNavManifestContentResult = await findFileByPath(
      result.files,
      ".well-known/opennav.json",
    ).getContent();

    expect({
      llmsTxt: llmsTxtContentResult.isOk()
        ? llmsTxtContentResult.value
        : llmsTxtContentResult.error,
      wellKnownLlmsTxt: wellKnownLlmsTxtContentResult.isOk()
        ? wellKnownLlmsTxtContentResult.value
        : wellKnownLlmsTxtContentResult.error,
      homeMarkdown: homeMarkdownContentResult.isOk()
        ? homeMarkdownContentResult.value
        : homeMarkdownContentResult.error,
      apiMarkdown: apiMarkdownContentResult.isOk()
        ? apiMarkdownContentResult.value
        : apiMarkdownContentResult.error,
      llmsFullTxt: llmsFullTxtContentResult.isOk()
        ? llmsFullTxtContentResult.value
        : llmsFullTxtContentResult.error,
      wellKnownLlmsFullTxt: wellKnownLlmsFullTxtContentResult.isOk()
        ? wellKnownLlmsFullTxtContentResult.value
        : wellKnownLlmsFullTxtContentResult.error,
      openNavManifest: openNavManifestContentResult.isOk()
        ? openNavManifestContentResult.value
        : openNavManifestContentResult.error,
    }).toEqual({
      llmsTxt: {
        content: appendExpectedBuildFingerprintMarker(
          "# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Project overview.\n\n## Docs\n\n- [API](https://example.com/docs/api.md): Use the API.\n",
        ),
        warnings: [],
      },
      wellKnownLlmsTxt: {
        content: appendExpectedBuildFingerprintMarker(
          "# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Project overview.\n\n## Docs\n\n- [API](https://example.com/docs/api.md): Use the API.\n",
        ),
        warnings: [],
      },
      homeMarkdown: {
        content: appendExpectedBuildFingerprintMarker(
          "# Home\n\nStart with the [API](https://example.com/docs/api.md).\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n",
        ),
        warnings: [],
      },
      apiMarkdown: {
        content: appendExpectedBuildFingerprintMarker(
          "# API\n\nUse API features after reading [Home](https://example.com/index.md).\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n",
        ),
        warnings: [],
      },
      llmsFullTxt: {
        content: appendExpectedBuildFingerprintMarker(
          "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\nProject overview.\n\n# Home\n\nStart with the [API](https://example.com/docs/api.md).\n\n---\n\n## Docs\n\n### API\n\nURL: https://example.com/docs/api.md\n\nUse the API.\n\n# API\n\nUse API features after reading [Home](https://example.com/index.md).\n",
        ),
        warnings: [],
      },
      wellKnownLlmsFullTxt: {
        content: appendExpectedBuildFingerprintMarker(
          "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\nProject overview.\n\n# Home\n\nStart with the [API](https://example.com/docs/api.md).\n\n---\n\n## Docs\n\n### API\n\nURL: https://example.com/docs/api.md\n\nUse the API.\n\n# API\n\nUse API features after reading [Home](https://example.com/index.md).\n",
        ),
        warnings: [],
      },
      openNavManifest: {
        content: createExpectedOpenNavManifestContent(false, true),
        warnings: [],
      },
    });
  });

  it("does not plan a generated Markdown file when that Markdown path already exists", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const htmlPage = createHtmlPage(
      "docs/api.html",
      "/docs/api-html",
      "HTML API",
      undefined,
    );
    const markdownPage = createMarkdownPage(
      "docs/api.md",
      "/docs/api-markdown",
      "Markdown API",
      undefined,
    );
    await writeSourceFile(
      outputDirectory,
      htmlPage,
      "<h1>HTML API</h1><p>Generated from HTML.</p>",
    );
    await writeSourceFile(
      outputDirectory,
      markdownPage,
      "# Markdown API\n\nGenerated from Markdown.\n",
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput(outputDirectory, [htmlPage, markdownPage]),
    );

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        html: fileReader.readCount("docs/api.html"),
        markdown: fileReader.readCount("docs/api.md"),
      },
    }).toEqual({
      filePaths: [
        "llms.txt",
        ".well-known/llms.txt",
        "llms-full.txt",
        ".well-known/llms-full.txt",
        ".well-known/opennav.json",
      ],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        html: 0,
        markdown: 0,
      },
    });
  });

  it("reports configured static capabilities in the OpenNav manifest", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const markdownPage = createMarkdownPage(
      "docs/api.md",
      "/docs/api",
      "Markdown API",
      undefined,
    );
    await writeSourceFile(
      outputDirectory,
      markdownPage,
      "# Markdown API\n\nGenerated from Markdown.\n",
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput(outputDirectory, [markdownPage], undefined, true),
    );
    const manifestFile = findFileByPath(
      result.files,
      ".well-known/opennav.json",
    );

    const contentResult = await manifestFile.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect({
        fileContent: contentResult.value,
        sourceReadCount: fileReader.readCount("docs/api.md"),
      }).toEqual({
        fileContent: {
          content: createExpectedOpenNavManifestContent(true, false),
          warnings: [],
        },
        sourceReadCount: 0,
      });
    }
  });

  it("generates only the requested Markdown page body when one page file is read", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const homePage = createHtmlPage(
      "index.html",
      "/",
      "Home",
      "Project overview.",
    );
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      "Use the API.",
    );
    const guidePage = createHtmlPage(
      "docs/guide.html",
      "/docs/guide",
      "Guide",
      "Read the guide.",
    );
    await writeSourceFile(
      outputDirectory,
      homePage,
      "<h1>Home</h1><p>Project overview.</p>",
    );
    await writeSourceFile(
      outputDirectory,
      apiPage,
      '<h1>API</h1><p>Use the <a href="/docs/guide">guide</a>.</p>',
    );
    await writeSourceFile(
      outputDirectory,
      guidePage,
      "<h1>Guide</h1><p>Read the guide.</p>",
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput(outputDirectory, [homePage, apiPage, guidePage]),
    );
    const apiFile = findFileByPath(result.files, "docs/api.md");

    const contentResult = await apiFile.getContent();

    expect(contentResult.isOk()).toEqual(true);
    if (contentResult.isOk()) {
      expect({
        fileContent: contentResult.value,
        sourceReadCounts: {
          home: fileReader.readCount("index.html"),
          api: fileReader.readCount("docs/api.html"),
          guide: fileReader.readCount("docs/guide.html"),
        },
      }).toEqual({
        fileContent: {
          content: appendExpectedBuildFingerprintMarker(
            "# API\n\nUse the [guide](https://example.com/docs/guide.md).\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n",
          ),
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

  it("returns source read errors from lazy Markdown page content callbacks", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      "Use the API.",
    );
    const sourceReadError = createReadError(outputDirectory, "docs/api.html");
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(createBuildInput(outputDirectory, [apiPage]));
    const apiFile = findFileByPath(result.files, "docs/api.md");

    const contentResult = await apiFile.getContent();

    expect({
      isErr: contentResult.isErr(),
      error: contentResult.isErr() ? contentResult.error : undefined,
      sourceReadCounts: {
        api: fileReader.readCount("docs/api.html"),
      },
    }).toEqual({
      isErr: true,
      error: sourceReadError,
      sourceReadCounts: {
        api: 1,
      },
    });
  });

  it("returns source read errors from the lazy llms-full content callback", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const homePage = createHtmlPage(
      "index.html",
      "/",
      "Home",
      "Project overview.",
    );
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      "Use the API.",
    );
    await writeSourceFile(
      outputDirectory,
      homePage,
      "<h1>Home</h1><p>Project overview.</p>",
    );
    const sourceReadError = createReadError(outputDirectory, "docs/api.html");
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });
    const result = builder.build(
      createBuildInput(outputDirectory, [homePage, apiPage]),
    );
    const llmsFullFile = findFileByPath(result.files, "llms-full.txt");
    const wellKnownLlmsFullFile = findFileByPath(
      result.files,
      ".well-known/llms-full.txt",
    );

    const contentResults = await Promise.all([
      llmsFullFile.getContent(),
      wellKnownLlmsFullFile.getContent(),
    ]);

    expect({
      contentResults: contentResults.map(
        (
          contentResult: Result<unknown, OpenNavError>,
        ): {
          readonly isErr: boolean;
          readonly error: OpenNavError | undefined;
        } => ({
          isErr: contentResult.isErr(),
          error: contentResult.isErr() ? contentResult.error : undefined,
        }),
      ),
      sourceReadCounts: {
        home: fileReader.readCount("index.html"),
        api: fileReader.readCount("docs/api.html"),
      },
    }).toEqual({
      contentResults: [
        {
          isErr: true,
          error: sourceReadError,
        },
        {
          isErr: true,
          error: sourceReadError,
        },
      ],
      sourceReadCounts: {
        home: 1,
        api: 1,
      },
    });
  });

  it("does not create a route-based index.md file for a non-index root HTML file", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const homePage = createHtmlPage("home.html", "/", "Home", "Home page.");
    await writeSourceFile(
      outputDirectory,
      homePage,
      "<h1>Home</h1><p>Home page.</p>",
    );
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(
        new StaticLlmsFullTxtTokenCounter(),
      ),
    });

    const result = builder.build(createBuildInput(outputDirectory, [homePage]));

    expect({
      filePaths: getFilePaths(result.files),
      skippedFilePaths: result.skippedFilePaths,
      warnings: result.warnings,
      sourceReadCounts: {
        home: fileReader.readCount("home.html"),
      },
    }).toEqual({
      filePaths: [
        "llms.txt",
        ".well-known/llms.txt",
        "home.md",
        "llms-full.txt",
        ".well-known/llms-full.txt",
        ".well-known/opennav.json",
      ],
      skippedFilePaths: [],
      warnings: [],
      sourceReadCounts: {
        home: 0,
      },
    });
  });

  it("returns llms-full token cap warnings from the lazy content callback", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const fileReader = new CountingEngineFileReader();
    const tokenCounter = new WhitespaceLlmsFullTxtTokenCounter();
    const homePage = createHtmlPage("index.html", "/", "Home", undefined);
    const apiPage = createHtmlPage(
      "docs/api.html",
      "/docs/api",
      "API",
      undefined,
    );
    await writeSourceFile(
      outputDirectory,
      homePage,
      "<h1>Home</h1><p>Hello agents.</p>",
    );
    await writeSourceFile(
      outputDirectory,
      apiPage,
      "<h1>API</h1><p>Use the engine.</p>",
    );
    const cappedContent =
      "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\n# Home\n\nHello agents.\n";
    const builder = new AgentContentFileBuilder({
      fileReader,
      llmsFullTxtGenerator: new LlmsFullTxtGenerator(tokenCounter),
    });
    const result = builder.build(
      createBuildInput(
        outputDirectory,
        [homePage, apiPage],
        tokenCounter.count(cappedContent),
      ),
    );
    const llmsFullFile = findFileByPath(result.files, "llms-full.txt");
    const wellKnownLlmsFullFile = findFileByPath(
      result.files,
      ".well-known/llms-full.txt",
    );

    const contentResults = await Promise.all([
      llmsFullFile.getContent(),
      wellKnownLlmsFullFile.getContent(),
    ]);

    expect(
      contentResults.map(
        (
          contentResult: Result<unknown, OpenNavError>,
        ): { readonly isOk: boolean; readonly value: unknown } => ({
          isOk: contentResult.isOk(),
          value: contentResult.isOk() ? contentResult.value : undefined,
        }),
      ),
    ).toEqual([
      {
        isOk: true,
        value: {
          content: appendExpectedBuildFingerprintMarker(cappedContent),
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
        },
      },
      {
        isOk: true,
        value: {
          content: appendExpectedBuildFingerprintMarker(cappedContent),
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
        },
      },
    ]);
  });
});
