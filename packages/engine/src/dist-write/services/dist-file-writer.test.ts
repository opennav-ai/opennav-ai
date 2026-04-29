import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { err, ok, type Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentContentFileContent } from "../../agent-content/types/agent-content-file-content";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { WriteFileContentProvider } from "../../write-plan/types/write-file-content-provider";
import type { WriteHtmlPageEditOperation } from "../../write-plan/types/write-html-page-edit-operation";
import type { WritePlan } from "../../write-plan/types/write-plan";
import type { DistWriteResult } from "../types/dist-write-result";
import { DistFileWriter } from "./dist-file-writer";

interface ContentProviderProbe {
  readonly contentProvider: WriteFileContentProvider;
  readonly readCount: () => number;
}

const CONTENT_WARNING: OpenNavError = {
  code: "LLMS_FULL_TXT_TOKEN_LIMIT_REACHED",
  message: "The full-context file omitted pages after reaching the token cap.",
  context: {
    outputFilePath: "llms-full.txt",
  },
};

const CONTENT_ERROR: OpenNavError = {
  code: "TEST_CONTENT_FAILED",
  message: "The test content provider failed.",
  context: {
    outputFilePath: "broken.txt",
  },
};
const INDEX_HEAD_LINK_MARKUP =
  '\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md" data-opennav="resource-link" data-opennav-sha="sha256:a348c8e1fc75f62942dc28432e57f8efc98268c0e1cdf0701f7c6621f39a47f0">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index" data-opennav="resource-link" data-opennav-sha="sha256:0b40d257efac082b8fcf31d9b81e3629d67a80f2d8e659da0ec321869c09ed9c">\n';

function createContentProviderProbe(
  content: string,
  warnings: readonly OpenNavError[] = [],
): ContentProviderProbe {
  let readCount = 0;

  return {
    contentProvider: {
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        readCount += 1;

        return ok({
          content,
          warnings,
        });
      },
    },
    readCount: (): number => readCount,
  };
}

function createFailingContentProviderProbe(
  error: OpenNavError,
): ContentProviderProbe {
  let readCount = 0;

  return {
    contentProvider: {
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        readCount += 1;

        return err(error);
      },
    },
    readCount: (): number => readCount,
  };
}

function createHtmlEditOperation(): WriteHtmlPageEditOperation {
  const htmlBeforeHeadInsertion = "<!doctype html><html><head>";

  return {
    kind: "edit-html-page",
    outputFilePath: "index.html",
    headInsertionOffset: htmlBeforeHeadInsertion.length,
    headLinkMarkup: INDEX_HEAD_LINK_MARKUP,
    links: [
      {
        relation: "alternate",
        mediaType: "text/markdown",
        href: "https://example.com/index.md",
      },
      {
        relation: "index",
        mediaType: "text/plain",
        href: "https://example.com/llms.txt",
        title: "LLMs text site index",
      },
    ],
  };
}

describe("DistFileWriter", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  async function createOutputDirectory(): Promise<string> {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-dist-write-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(outputDirectory);

    return outputDirectory;
  }

  async function pathExists(filePath: string): Promise<boolean> {
    try {
      await lstat(filePath);
      return true;
    } catch (cause: unknown) {
      if (
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        cause.code === "ENOENT"
      ) {
        return false;
      }

      throw cause;
    }
  }

  async function readOutputFile(
    outputDirectory: string,
    outputFilePath: EngineFilePath,
  ): Promise<string> {
    return await readFile(join(outputDirectory, outputFilePath), "utf8");
  }

  async function writeOutputFile(
    outputDirectory: string,
    outputFilePath: EngineFilePath,
    content: string,
  ): Promise<void> {
    const absoluteFilePath = join(outputDirectory, outputFilePath);
    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, content, "utf8");
  }

  describe("success", (): void => {
    it("returns empty records and leaves files untouched when the approved plan has no operations", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "llms.txt", "# Caller File\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          content: await readOutputFile(outputDirectory, "llms.txt"),
        }).toEqual({
          result: {
            records: [],
            warnings: [],
          },
          content: "# Caller File\n",
        });
      }
    });

    it("writes exact Phase 1 file shapes for generated text, markdown, manifest, robots guidance, and HTML edits", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const htmlBeforeHeadInsertion = "<!doctype html><html><head>";
      await writeOutputFile(
        outputDirectory,
        "index.html",
        `${htmlBeforeHeadInsertion}<title>Home</title></head><body>Hi</body></html>`,
      );
      const llmsTxtProvider = createContentProviderProbe(
        '# Example Docs\n\n- [Home](https://example.com/index.md)\n\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\n',
      );
      const wellKnownLlmsTxtProvider = createContentProviderProbe(
        '# Example Docs\n\n- [Home](https://example.com/index.md)\n\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\n',
      );
      const markdownProvider = createContentProviderProbe(
        '# API\n\nUse the API.\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json" -->\n',
      );
      const manifestProvider = createContentProviderProbe(
        '{\n  "opennav": true,\n  "profile": "static-agent-ready",\n  "build_fingerprint": "sha256:build"\n}\n',
      );
      const robotsProvider = createContentProviderProbe(
        'User-agent: *\nAllow: /\n\n# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\nContent-signal: ai-train=no\n# End OpenNav AI\n',
      );
      const writer = new DistFileWriter();
      const plan: WritePlan = {
        operations: [
          {
            kind: "create-file",
            outputFilePath: "llms.txt",
            contentProvider: llmsTxtProvider.contentProvider,
          },
          {
            kind: "create-file",
            outputFilePath: ".well-known/llms.txt",
            contentProvider: wellKnownLlmsTxtProvider.contentProvider,
          },
          {
            kind: "create-file",
            outputFilePath: "docs/api.md",
            contentProvider: markdownProvider.contentProvider,
          },
          {
            kind: "create-file",
            outputFilePath: ".well-known/opennav.json",
            contentProvider: manifestProvider.contentProvider,
          },
          {
            kind: "create-file",
            outputFilePath: "robots.txt",
            contentProvider: robotsProvider.contentProvider,
          },
          createHtmlEditOperation(),
        ],
      };

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan,
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          files: {
            llmsTxt: await readOutputFile(outputDirectory, "llms.txt"),
            wellKnownLlmsTxt: await readOutputFile(
              outputDirectory,
              ".well-known/llms.txt",
            ),
            markdown: await readOutputFile(outputDirectory, "docs/api.md"),
            manifest: await readOutputFile(
              outputDirectory,
              ".well-known/opennav.json",
            ),
            robots: await readOutputFile(outputDirectory, "robots.txt"),
            html: await readOutputFile(outputDirectory, "index.html"),
          },
          readCounts: {
            llmsTxt: llmsTxtProvider.readCount(),
            wellKnownLlmsTxt: wellKnownLlmsTxtProvider.readCount(),
            markdown: markdownProvider.readCount(),
            manifest: manifestProvider.readCount(),
            robots: robotsProvider.readCount(),
          },
        }).toEqual({
          result: {
            records: [
              {
                kind: "created-file",
                outputFilePath: "llms.txt",
              },
              {
                kind: "created-file",
                outputFilePath: ".well-known/llms.txt",
              },
              {
                kind: "created-file",
                outputFilePath: "docs/api.md",
              },
              {
                kind: "created-file",
                outputFilePath: ".well-known/opennav.json",
              },
              {
                kind: "created-file",
                outputFilePath: "robots.txt",
              },
              {
                kind: "edited-html-page",
                outputFilePath: "index.html",
              },
            ],
            warnings: [],
          },
          files: {
            llmsTxt:
              '# Example Docs\n\n- [Home](https://example.com/index.md)\n\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\n',
            wellKnownLlmsTxt:
              '# Example Docs\n\n- [Home](https://example.com/index.md)\n\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\n',
            markdown:
              '# API\n\nUse the API.\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json" -->\n',
            manifest:
              '{\n  "opennav": true,\n  "profile": "static-agent-ready",\n  "build_fingerprint": "sha256:build"\n}\n',
            robots:
              'User-agent: *\nAllow: /\n\n# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\nContent-signal: ai-train=no\n# End OpenNav AI\n',
            html: `<!doctype html><html><head>${INDEX_HEAD_LINK_MARKUP}<title>Home</title></head><body>Hi</body></html>`,
          },
          readCounts: {
            llmsTxt: 1,
            wellKnownLlmsTxt: 1,
            markdown: 1,
            manifest: 1,
            robots: 1,
          },
        });
      }
    });

    it("creates nested parent directories for generated files", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const provider = createContentProviderProbe("# Deep Page\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "docs/guides/deep/page.md",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          content: await readOutputFile(
            outputDirectory,
            "docs/guides/deep/page.md",
          ),
          readCount: provider.readCount(),
        }).toEqual({
          result: {
            records: [
              {
                kind: "created-file",
                outputFilePath: "docs/guides/deep/page.md",
              },
            ],
            warnings: [],
          },
          content: "# Deep Page\n",
          readCount: 1,
        });
      }
    });

    it("overwrites exact content for an approved overwrite operation", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "llms.txt", "# Old\n");
      const provider = createContentProviderProbe("# New\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          content: await readOutputFile(outputDirectory, "llms.txt"),
          readCount: provider.readCount(),
        }).toEqual({
          result: {
            records: [
              {
                kind: "overwritten-file",
                outputFilePath: "llms.txt",
              },
            ],
            warnings: [],
          },
          content: "# New\n",
          readCount: 1,
        });
      }
    });

    it("preserves write-plan order and collects content-provider warnings", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(
        outputDirectory,
        "index.html",
        "<html><head></head></html>",
      );
      await writeOutputFile(outputDirectory, "llms-full.txt", "# Old Full\n");
      const llmsFullProvider = createContentProviderProbe("# New Full\n", [
        CONTENT_WARNING,
      ]);
      const llmsTxtProvider = createContentProviderProbe("# Index\n");
      const editOperation: WriteHtmlPageEditOperation = {
        ...createHtmlEditOperation(),
        headInsertionOffset: "<html><head>".length,
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms-full.txt",
              contentProvider: llmsFullProvider.contentProvider,
            },
            editOperation,
            {
              kind: "create-file",
              outputFilePath: "llms.txt",
              contentProvider: llmsTxtProvider.contentProvider,
            },
          ],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          files: {
            llmsFull: await readOutputFile(outputDirectory, "llms-full.txt"),
            html: await readOutputFile(outputDirectory, "index.html"),
            llms: await readOutputFile(outputDirectory, "llms.txt"),
          },
          readCounts: {
            llmsFull: llmsFullProvider.readCount(),
            llms: llmsTxtProvider.readCount(),
          },
        }).toEqual({
          result: {
            records: [
              {
                kind: "overwritten-file",
                outputFilePath: "llms-full.txt",
              },
              {
                kind: "edited-html-page",
                outputFilePath: "index.html",
              },
              {
                kind: "created-file",
                outputFilePath: "llms.txt",
              },
            ],
            warnings: [CONTENT_WARNING],
          },
          files: {
            llmsFull: "# New Full\n",
            html: `<html><head>${INDEX_HEAD_LINK_MARKUP}</head></html>`,
            llms: "# Index\n",
          },
          readCounts: {
            llmsFull: 1,
            llms: 1,
          },
        });
      }
    });

    it("applies exact HTML insertion for uppercase head tags with attributes", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const htmlBeforeHeadInsertion =
        '<!doctype html><html><HEAD data-page="home">';
      await writeOutputFile(
        outputDirectory,
        "index.html",
        `${htmlBeforeHeadInsertion}<title>Home</title></HEAD></html>`,
      );
      const editOperation: WriteHtmlPageEditOperation = {
        ...createHtmlEditOperation(),
        headInsertionOffset: htmlBeforeHeadInsertion.length,
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [editOperation],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          html: await readOutputFile(outputDirectory, "index.html"),
        }).toEqual({
          result: {
            records: [
              {
                kind: "edited-html-page",
                outputFilePath: "index.html",
              },
            ],
            warnings: [],
          },
          html: `<!doctype html><html><HEAD data-page="home">${INDEX_HEAD_LINK_MARKUP}<title>Home</title></HEAD></html>`,
        });
      }
    });

    it("replaces existing matching HTML resource links instead of appending duplicates", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const htmlBeforeHeadInsertion = "<!doctype html><html><head>";
      await writeOutputFile(
        outputDirectory,
        "index.html",
        `${htmlBeforeHeadInsertion}
  <link rel="alternate" type="text/markdown" href="https://example.com/index.md">
  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">

<title>Home</title></head><body>Hi</body></html>`,
      );
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [createHtmlEditOperation()],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          html: await readOutputFile(outputDirectory, "index.html"),
        }).toEqual({
          result: {
            records: [
              {
                kind: "edited-html-page",
                outputFilePath: "index.html",
              },
            ],
            warnings: [],
          },
          html: `<!doctype html><html><head>${INDEX_HEAD_LINK_MARKUP}<title>Home</title></head><body>Hi</body></html>`,
        });
      }
    });

    it("writes large multiline generated files and HTML edits exactly", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const htmlBeforeHeadInsertion =
        '<!doctype html>\n<html>\n<head class="docs">';
      const largeMarkdown = Array.from(
        { length: 250 },
        (_value: unknown, index: number): string =>
          `### Section ${index}\n\n- item ${index}\n- route /docs/${index}\n`,
      ).join("\n");
      const largeHtmlBody = Array.from(
        { length: 120 },
        (_value: unknown, index: number): string => `<p>Paragraph ${index}</p>`,
      ).join("\n");
      await writeOutputFile(
        outputDirectory,
        "docs/index.html",
        `${htmlBeforeHeadInsertion}\n<title>Docs</title>\n</head>\n<body>\n${largeHtmlBody}\n</body>\n</html>\n`,
      );
      await writeOutputFile(outputDirectory, "llms-full.txt", "old full\n");
      const markdownProvider = createContentProviderProbe(largeMarkdown);
      const llmsFullProvider = createContentProviderProbe(
        `# Full\n\n${largeMarkdown}`,
      );
      const editOperation: WriteHtmlPageEditOperation = {
        ...createHtmlEditOperation(),
        outputFilePath: "docs/index.html",
        headInsertionOffset: htmlBeforeHeadInsertion.length,
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "docs/index.md",
              contentProvider: markdownProvider.contentProvider,
            },
            {
              kind: "overwrite-file",
              outputFilePath: "llms-full.txt",
              contentProvider: llmsFullProvider.contentProvider,
            },
            editOperation,
          ],
        },
      });

      expect(result.isOk()).toEqual(true);
      if (result.isOk()) {
        expect({
          result: result.value,
          markdown: await readOutputFile(outputDirectory, "docs/index.md"),
          llmsFull: await readOutputFile(outputDirectory, "llms-full.txt"),
          html: await readOutputFile(outputDirectory, "docs/index.html"),
          readCounts: {
            markdown: markdownProvider.readCount(),
            llmsFull: llmsFullProvider.readCount(),
          },
        }).toEqual({
          result: {
            records: [
              {
                kind: "created-file",
                outputFilePath: "docs/index.md",
              },
              {
                kind: "overwritten-file",
                outputFilePath: "llms-full.txt",
              },
              {
                kind: "edited-html-page",
                outputFilePath: "docs/index.html",
              },
            ],
            warnings: [],
          },
          markdown: largeMarkdown,
          llmsFull: `# Full\n\n${largeMarkdown}`,
          html: `${htmlBeforeHeadInsertion}${INDEX_HEAD_LINK_MARKUP}\n<title>Docs</title>\n</head>\n<body>\n${largeHtmlBody}\n</body>\n</html>\n`,
          readCounts: {
            markdown: 1,
            llmsFull: 1,
          },
        });
      }
    });
  });

  describe("failure", (): void => {
    it("returns an exact typed error when a planned output path escapes the output directory", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const provider = createContentProviderProbe("outside\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "../outside.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          readCount: provider.readCount(),
        }).toEqual({
          error: {
            code: "DIST_WRITE_OUTPUT_PATH_OUTSIDE_OUTPUT_DIRECTORY",
            message:
              "Dist writing can only apply operations inside the output directory.",
            context: {
              outputDirectory,
              outputFilePath: "../outside.txt",
            },
          },
          readCount: 0,
        });
      }
    });

    it("returns an exact stale-plan error when a create target already exists", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "llms.txt", "# Caller File\n");
      const provider = createContentProviderProbe("# Generated\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "llms.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          content: await readOutputFile(outputDirectory, "llms.txt"),
          readCount: provider.readCount(),
        }).toEqual({
          error: {
            code: "DIST_WRITE_STALE_CREATE_TARGET",
            message:
              "A create-file operation target already exists at write time.",
            context: {
              outputDirectory,
              outputFilePath: "llms.txt",
            },
          },
          content: "# Caller File\n",
          readCount: 0,
        });
      }
    });

    it("returns an exact stale-plan error when an overwrite target is missing", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const provider = createContentProviderProbe("# New\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          readCount: provider.readCount(),
        }).toEqual({
          error: {
            code: "DIST_WRITE_STALE_OVERWRITE_TARGET",
            message:
              "An overwrite-file operation target is missing at write time.",
            context: {
              outputDirectory,
              outputFilePath: "llms.txt",
            },
          },
          readCount: 0,
        });
      }
    });

    it("returns an exact path-kind conflict when an overwrite target is a directory", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await mkdir(join(outputDirectory, "llms.txt"));
      const provider = createContentProviderProbe("# New\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          readCount: provider.readCount(),
        }).toEqual({
          error: {
            code: "DIST_WRITE_PATH_KIND_CONFLICT",
            message: "A planned output path is not writable as a file.",
            context: {
              outputDirectory,
              outputFilePath: "llms.txt",
            },
          },
          readCount: 0,
        });
      }
    });

    it("returns an exact path-kind conflict when a needed parent directory is a file", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "docs", "not a directory\n");
      const provider = createContentProviderProbe("# API\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "docs/api.md",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          readCount: provider.readCount(),
        }).toEqual({
          error: {
            code: "DIST_WRITE_PATH_KIND_CONFLICT",
            message:
              "A parent path needed for a planned file is already a file.",
            context: {
              outputDirectory,
              outputFilePath: "docs/api.md",
            },
          },
          readCount: 0,
        });
      }
    });

    it("returns an exact stale-plan edit error when the planned HTML head offset no longer matches", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(
        outputDirectory,
        "index.html",
        "<html><body>No head here</body></html>",
      );
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [createHtmlEditOperation()],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect(result.error).toEqual({
          code: "DIST_WRITE_STALE_HTML_PAGE_EDIT",
          message:
            "A planned HTML page edit no longer matches the current file content.",
          context: {
            outputDirectory,
            outputFilePath: "index.html",
            headInsertionOffset: "<!doctype html><html><head>".length,
          },
        });
      }
    });

    it("returns an exact stale-plan edit error for a negative HTML head offset", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "index.html", "<head>z");
      const editOperation: WriteHtmlPageEditOperation = {
        ...createHtmlEditOperation(),
        headInsertionOffset: -1,
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [editOperation],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          html: await readOutputFile(outputDirectory, "index.html"),
        }).toEqual({
          error: {
            code: "DIST_WRITE_STALE_HTML_PAGE_EDIT",
            message:
              "A planned HTML page edit no longer matches the current file content.",
            context: {
              outputDirectory,
              outputFilePath: "index.html",
              headInsertionOffset: -1,
            },
          },
          html: "<head>z",
        });
      }
    });

    it("returns the lazy content error before writing that file", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const provider = createFailingContentProviderProbe(CONTENT_ERROR);
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "broken.txt",
              contentProvider: provider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          fileExists: await pathExists(join(outputDirectory, "broken.txt")),
          readCount: provider.readCount(),
        }).toEqual({
          error: CONTENT_ERROR,
          fileExists: false,
          readCount: 1,
        });
      }
    });

    it("stops on the first failing operation and does not apply later operations", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "llms.txt", "# Caller File\n");
      const firstProvider = createContentProviderProbe("# Generated\n");
      const laterProvider = createContentProviderProbe("# Later\n");
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "llms.txt",
              contentProvider: firstProvider.contentProvider,
            },
            {
              kind: "create-file",
              outputFilePath: "later.txt",
              contentProvider: laterProvider.contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          llmsContent: await readOutputFile(outputDirectory, "llms.txt"),
          laterFileExists: await pathExists(join(outputDirectory, "later.txt")),
          readCounts: {
            first: firstProvider.readCount(),
            later: laterProvider.readCount(),
          },
        }).toEqual({
          error: {
            code: "DIST_WRITE_STALE_CREATE_TARGET",
            message:
              "A create-file operation target already exists at write time.",
            context: {
              outputDirectory,
              outputFilePath: "llms.txt",
            },
          },
          llmsContent: "# Caller File\n",
          laterFileExists: false,
          readCounts: {
            first: 0,
            later: 0,
          },
        });
      }
    });

    it("does not overwrite a create target that appears while lazy content is generated", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      const contentProvider: WriteFileContentProvider = {
        getContent: async (): Promise<
          Result<AgentContentFileContent, OpenNavError>
        > => {
          await writeOutputFile(
            outputDirectory,
            "race.txt",
            "caller-created during content generation\n",
          );

          return ok({
            content: "generated content\n",
            warnings: [],
          });
        },
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "race.txt",
              contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          content: await readOutputFile(outputDirectory, "race.txt"),
        }).toEqual({
          error: {
            code: "DIST_WRITE_STALE_CREATE_TARGET",
            message:
              "A create-file operation target already exists at write time.",
            context: {
              outputDirectory,
              outputFilePath: "race.txt",
            },
          },
          content: "caller-created during content generation\n",
        });
      }
    });

    it("removes temporary overwrite content when the target becomes a directory before replacement", async (): Promise<void> => {
      const outputDirectory = await createOutputDirectory();
      await writeOutputFile(outputDirectory, "llms.txt", "# Old\n");
      const contentProvider: WriteFileContentProvider = {
        getContent: async (): Promise<
          Result<AgentContentFileContent, OpenNavError>
        > => {
          await rm(join(outputDirectory, "llms.txt"), { force: true });
          await mkdir(join(outputDirectory, "llms.txt"));

          return ok({
            content: "# New\n",
            warnings: [],
          });
        },
      };
      const writer = new DistFileWriter();

      const result: Result<DistWriteResult, OpenNavError> = await writer.write({
        outputDirectory,
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms.txt",
              contentProvider,
            },
          ],
        },
      });

      expect(result.isErr()).toEqual(true);
      if (result.isErr()) {
        expect({
          error: result.error,
          directoryEntries: await readdir(outputDirectory),
        }).toEqual({
          error: {
            code: "DIST_WRITE_PATH_KIND_CONFLICT",
            message: "A planned output path is not writable as a file.",
            context: {
              outputDirectory,
              outputFilePath: "llms.txt",
            },
          },
          directoryEntries: ["llms.txt"],
        });
      }
    });
  });
});
