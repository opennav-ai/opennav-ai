import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ok, type Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { AccessGuidanceFile } from "../../access-guidance/types/access-guidance-file";
import type { AgentContentFile } from "../../agent-content/types/agent-content-file";
import type { AgentContentFileContent } from "../../agent-content/types/agent-content-file-content";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { ResourceLinkPageEdit } from "../../resource-links/types/resource-link-page-edit";
import type { WriteFileOperation } from "../types/write-file-operation";
import type { WriteOperation } from "../types/write-operation";
import type { WritePlanResult } from "../types/write-plan-result";
import { WritePlanBuilder } from "./write-plan-builder";

interface FileOperationContentSummary {
  readonly content: AgentContentFileContent | OpenNavError;
  readonly kind: WriteFileOperation["kind"];
  readonly outputFilePath: string;
}

interface GeneratedFileProbe {
  readonly file: AgentContentFile;
  readonly readCount: () => number;
}

interface ProtectedGeneratedFileCase {
  readonly existingContent: string;
  readonly outputFilePath: string;
}

interface TraversalCase {
  readonly accessGuidanceFiles: readonly AccessGuidanceFile[];
  readonly generatedFiles: readonly AgentContentFile[];
  readonly outputFilePath: string;
  readonly pageEdits: readonly ResourceLinkPageEdit[];
}

const BUILD_FINGERPRINT = "sha256:build";
const HTML_BUILD_MARKER = `<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json" -->\n`;
const LINE_BUILD_MARKER = `# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json"\n`;

function appendOpenNavBuildMarker(content: string): string {
  return `${content}\n${HTML_BUILD_MARKER}`;
}

function createGeneratedFileProbe(
  outputFilePath: string,
  content: string,
): GeneratedFileProbe {
  let readCount = 0;

  return {
    file: {
      outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        readCount += 1;

        return ok({
          content,
          warnings: [],
        });
      },
    },
    readCount: (): number => readCount,
  };
}

function createManagedRobotsBlock(contentSignalLine: string): string {
  return `# Begin OpenNav AI\n${LINE_BUILD_MARKER}${contentSignalLine}\n# End OpenNav AI\n`;
}

function createOpenNavManifestContent(): string {
  return `{\n  "opennav": true,\n  "build_fingerprint": "${BUILD_FINGERPRINT}"\n}\n`;
}

function createPageEdit(): ResourceLinkPageEdit {
  return {
    sourceFilePath: "index.html",
    headInsertionOffset: 12,
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
    headLinkMarkup:
      '\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n',
  };
}

async function summarizeFileOperationsWithContent(
  operations: readonly WriteOperation[],
): Promise<readonly FileOperationContentSummary[]> {
  const summaries: FileOperationContentSummary[] = [];

  for (const operation of operations) {
    if (operation.kind === "edit-html-page") {
      continue;
    }

    const contentResult = await operation.contentProvider.getContent();

    summaries.push({
      kind: operation.kind,
      outputFilePath: operation.outputFilePath,
      content: contentResult.isOk() ? contentResult.value : contentResult.error,
    });
  }

  return summaries;
}

describe("WritePlanBuilder", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  async function createOutputDirectory(): Promise<string> {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-write-plan-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(outputDirectory);

    return outputDirectory;
  }

  async function writeOutputFile(
    outputDirectory: string,
    outputFilePath: string,
    content: string,
  ): Promise<void> {
    const absoluteFilePath = join(outputDirectory, outputFilePath);
    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, content, "utf8");
  }

  it("returns exact create operations for every missing generated file category without reading lazy content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const llmsTxtProbe = createGeneratedFileProbe("llms.txt", "# Example\n");
    const wellKnownLlmsTxtProbe = createGeneratedFileProbe(
      ".well-known/llms.txt",
      "# Example\n",
    );
    const llmsFullTxtProbe = createGeneratedFileProbe(
      "llms-full.txt",
      "# Example Full\n",
    );
    const wellKnownLlmsFullTxtProbe = createGeneratedFileProbe(
      ".well-known/llms-full.txt",
      "# Example Full\n",
    );
    const markdownProbe = createGeneratedFileProbe("docs/api.md", "# API\n");
    const manifestProbe = createGeneratedFileProbe(
      ".well-known/opennav.json",
      createOpenNavManifestContent(),
    );
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [
        llmsTxtProbe.file,
        wellKnownLlmsTxtProbe.file,
        llmsFullTxtProbe.file,
        wellKnownLlmsFullTxtProbe.file,
        markdownProbe.file,
        manifestProbe.file,
      ],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        plan: result.value.plan,
        warnings: result.value.warnings,
        sourceReadCount: {
          llmsTxt: llmsTxtProbe.readCount(),
          wellKnownLlmsTxt: wellKnownLlmsTxtProbe.readCount(),
          llmsFullTxt: llmsFullTxtProbe.readCount(),
          wellKnownLlmsFullTxt: wellKnownLlmsFullTxtProbe.readCount(),
          markdown: markdownProbe.readCount(),
          manifest: manifestProbe.readCount(),
        },
      }).toEqual({
        plan: {
          operations: [
            {
              kind: "create-file",
              outputFilePath: "llms.txt",
              contentProvider: llmsTxtProbe.file,
            },
            {
              kind: "create-file",
              outputFilePath: ".well-known/llms.txt",
              contentProvider: wellKnownLlmsTxtProbe.file,
            },
            {
              kind: "create-file",
              outputFilePath: "llms-full.txt",
              contentProvider: llmsFullTxtProbe.file,
            },
            {
              kind: "create-file",
              outputFilePath: ".well-known/llms-full.txt",
              contentProvider: wellKnownLlmsFullTxtProbe.file,
            },
            {
              kind: "create-file",
              outputFilePath: "docs/api.md",
              contentProvider: markdownProbe.file,
            },
            {
              kind: "create-file",
              outputFilePath: ".well-known/opennav.json",
              contentProvider: manifestProbe.file,
            },
          ],
        },
        warnings: [],
        sourceReadCount: {
          llmsTxt: 0,
          wellKnownLlmsTxt: 0,
          llmsFullTxt: 0,
          wellKnownLlmsFullTxt: 0,
          markdown: 0,
          manifest: 0,
        },
      });
    }
  });

  it("returns exact overwrite operations for every existing OpenNav-managed generated file category without reading lazy content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(
      outputDirectory,
      "llms.txt",
      appendOpenNavBuildMarker("# Old Index\n"),
    );
    await writeOutputFile(
      outputDirectory,
      ".well-known/llms.txt",
      appendOpenNavBuildMarker("# Old Index\n"),
    );
    await writeOutputFile(
      outputDirectory,
      "llms-full.txt",
      appendOpenNavBuildMarker("# Old Full\n"),
    );
    await writeOutputFile(
      outputDirectory,
      ".well-known/llms-full.txt",
      appendOpenNavBuildMarker("# Old Full\n"),
    );
    await writeOutputFile(
      outputDirectory,
      "docs/api.md",
      appendOpenNavBuildMarker("# Old API\n"),
    );
    await writeOutputFile(
      outputDirectory,
      ".well-known/opennav.json",
      createOpenNavManifestContent(),
    );
    const llmsTxtProbe = createGeneratedFileProbe("llms.txt", "# New Index\n");
    const wellKnownLlmsTxtProbe = createGeneratedFileProbe(
      ".well-known/llms.txt",
      "# New Index\n",
    );
    const llmsFullTxtProbe = createGeneratedFileProbe(
      "llms-full.txt",
      "# New Full\n",
    );
    const wellKnownLlmsFullTxtProbe = createGeneratedFileProbe(
      ".well-known/llms-full.txt",
      "# New Full\n",
    );
    const markdownProbe = createGeneratedFileProbe("docs/api.md", "# API\n");
    const manifestProbe = createGeneratedFileProbe(
      ".well-known/opennav.json",
      createOpenNavManifestContent(),
    );
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [
        llmsTxtProbe.file,
        wellKnownLlmsTxtProbe.file,
        llmsFullTxtProbe.file,
        wellKnownLlmsFullTxtProbe.file,
        markdownProbe.file,
        manifestProbe.file,
      ],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        plan: result.value.plan,
        warnings: result.value.warnings,
        sourceReadCount: {
          llmsTxt: llmsTxtProbe.readCount(),
          wellKnownLlmsTxt: wellKnownLlmsTxtProbe.readCount(),
          llmsFullTxt: llmsFullTxtProbe.readCount(),
          wellKnownLlmsFullTxt: wellKnownLlmsFullTxtProbe.readCount(),
          markdown: markdownProbe.readCount(),
          manifest: manifestProbe.readCount(),
        },
      }).toEqual({
        plan: {
          operations: [
            {
              kind: "overwrite-file",
              outputFilePath: "llms.txt",
              contentProvider: llmsTxtProbe.file,
            },
            {
              kind: "overwrite-file",
              outputFilePath: ".well-known/llms.txt",
              contentProvider: wellKnownLlmsTxtProbe.file,
            },
            {
              kind: "overwrite-file",
              outputFilePath: "llms-full.txt",
              contentProvider: llmsFullTxtProbe.file,
            },
            {
              kind: "overwrite-file",
              outputFilePath: ".well-known/llms-full.txt",
              contentProvider: wellKnownLlmsFullTxtProbe.file,
            },
            {
              kind: "overwrite-file",
              outputFilePath: "docs/api.md",
              contentProvider: markdownProbe.file,
            },
            {
              kind: "overwrite-file",
              outputFilePath: ".well-known/opennav.json",
              contentProvider: manifestProbe.file,
            },
          ],
        },
        warnings: [],
        sourceReadCount: {
          llmsTxt: 0,
          wellKnownLlmsTxt: 0,
          llmsFullTxt: 0,
          wellKnownLlmsFullTxt: 0,
          markdown: 0,
          manifest: 0,
        },
      });
    }
  });

  it.each<ProtectedGeneratedFileCase>([
    {
      outputFilePath: "llms.txt",
      existingContent: "# Caller Index\n",
    },
    {
      outputFilePath: ".well-known/llms.txt",
      existingContent: "# Caller Well-Known Index\n",
    },
    {
      outputFilePath: "llms-full.txt",
      existingContent: "# Caller Full Context\n",
    },
    {
      outputFilePath: ".well-known/llms-full.txt",
      existingContent: "# Caller Well-Known Full Context\n",
    },
    {
      outputFilePath: "docs/api.md",
      existingContent: "# Caller API\n",
    },
    {
      outputFilePath: "docs/api.md",
      existingContent:
        '# Caller API\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" manifest="/.well-known/opennav.json" -->\n',
    },
    {
      outputFilePath: "docs/api.md",
      existingContent:
        '# Caller API\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" -->\n',
    },
    {
      outputFilePath: ".well-known/opennav.json",
      existingContent: '{\n  "opennav": false\n}\n',
    },
  ])("returns exact protected-file error for caller-owned generated file $outputFilePath without reading lazy content", async ({
    outputFilePath,
    existingContent,
  }: ProtectedGeneratedFileCase): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(outputDirectory, outputFilePath, existingContent);
    const fileProbe = createGeneratedFileProbe(outputFilePath, "new content\n");
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [fileProbe.file],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
      sourceReadCount: fileProbe.readCount(),
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PROTECTED_OUTPUT_FILE",
        message:
          "The write planner will not overwrite a caller-owned output file.",
        context: {
          outputDirectory,
          outputFilePath,
        },
      },
      sourceReadCount: 0,
    });
  });

  it("returns exact HTML page edit operation for a planned resource link edit", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(
      outputDirectory,
      "index.html",
      "<html><head><title>Home</title></head></html>",
    );
    const pageEdit = createPageEdit();
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [pageEdit],
      accessGuidanceFiles: [],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        plan: {
          operations: [
            {
              kind: "edit-html-page",
              outputFilePath: "index.html",
              headInsertionOffset: 12,
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
              headLinkMarkup:
                '\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n',
            },
          ],
        },
        warnings: [],
      });
    }
  });

  it("returns exact combined write plan order for generated files, page edits, and access guidance", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(
      outputDirectory,
      "index.html",
      "<html><head><title>Home</title></head></html>",
    );
    const llmsTxtProbe = createGeneratedFileProbe("llms.txt", "# Example\n");
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: createManagedRobotsBlock("Content-signal: search=yes"),
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [llmsTxtProbe.file],
      pageEdits: [createPageEdit()],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        operations: result.value.plan.operations.map(
          (
            operation: WriteOperation,
          ):
            | {
                readonly headInsertionOffset: number;
                readonly headLinkMarkup: string;
                readonly kind: "edit-html-page";
                readonly outputFilePath: string;
              }
            | {
                readonly kind: "create-file" | "overwrite-file";
                readonly outputFilePath: string;
              } => {
            if (operation.kind === "edit-html-page") {
              return {
                kind: operation.kind,
                outputFilePath: operation.outputFilePath,
                headInsertionOffset: operation.headInsertionOffset,
                headLinkMarkup: operation.headLinkMarkup,
              };
            }

            return {
              kind: operation.kind,
              outputFilePath: operation.outputFilePath,
            };
          },
        ),
        warnings: result.value.warnings,
        sourceReadCount: llmsTxtProbe.readCount(),
      }).toEqual({
        operations: [
          {
            kind: "create-file",
            outputFilePath: "llms.txt",
          },
          {
            kind: "edit-html-page",
            outputFilePath: "index.html",
            headInsertionOffset: 12,
            headLinkMarkup:
              '\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n',
          },
          {
            kind: "create-file",
            outputFilePath: "robots.txt",
          },
        ],
        warnings: [],
        sourceReadCount: 0,
      });
    }
  });

  it("returns exact create operation for missing access-guidance robots.txt", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const plannedRobotsContent = createManagedRobotsBlock(
      "User-agent: *\nContent-signal: search=yes",
    );
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: plannedRobotsContent,
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        operations: await summarizeFileOperationsWithContent(
          result.value.plan.operations,
        ),
        warnings: result.value.warnings,
      }).toEqual({
        operations: [
          {
            kind: "create-file",
            outputFilePath: "robots.txt",
            content: {
              content: plannedRobotsContent,
              warnings: [],
            },
          },
        ],
        warnings: [],
      });
    }
  });

  it("returns exact overwrite operation when access guidance preserves caller-owned robots.txt content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const existingRobotsContent = "User-agent: *\nDisallow: /admin\n";
    const plannedRobotsContent = `User-agent: *\n${createManagedRobotsBlock(
      "Content-signal: search=yes",
    )}Disallow: /admin\n`;
    await writeOutputFile(outputDirectory, "robots.txt", existingRobotsContent);
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: plannedRobotsContent,
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        operations: await summarizeFileOperationsWithContent(
          result.value.plan.operations,
        ),
        warnings: result.value.warnings,
      }).toEqual({
        operations: [
          {
            kind: "overwrite-file",
            outputFilePath: "robots.txt",
            content: {
              content: plannedRobotsContent,
              warnings: [],
            },
          },
        ],
        warnings: [],
      });
    }
  });

  it("returns exact overwrite operation when access guidance replaces an existing OpenNav-managed robots.txt block", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const existingRobotsContent = `User-agent: *\n${createManagedRobotsBlock(
      "Content-signal: search=no",
    )}Disallow: /admin\n`;
    const plannedRobotsContent = `User-agent: *\n${createManagedRobotsBlock(
      "Content-signal: search=yes",
    )}Disallow: /admin\n`;
    await writeOutputFile(outputDirectory, "robots.txt", existingRobotsContent);
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: plannedRobotsContent,
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        operations: await summarizeFileOperationsWithContent(
          result.value.plan.operations,
        ),
        warnings: result.value.warnings,
      }).toEqual({
        operations: [
          {
            kind: "overwrite-file",
            outputFilePath: "robots.txt",
            content: {
              content: plannedRobotsContent,
              warnings: [],
            },
          },
        ],
        warnings: [],
      });
    }
  });

  it("returns exact protected-file error when access guidance would replace caller-owned robots.txt content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(
      outputDirectory,
      "robots.txt",
      "User-agent: *\nDisallow: /admin\n",
    );
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: createManagedRobotsBlock("Content-signal: search=yes"),
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PROTECTED_OUTPUT_FILE",
        message:
          "The write planner will not overwrite a caller-owned output file.",
        context: {
          outputDirectory,
          outputFilePath: "robots.txt",
        },
      },
    });
  });

  it("returns exact protected-file error when access guidance has an unmarked managed robots.txt block", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(
      outputDirectory,
      "robots.txt",
      "User-agent: *\nDisallow: /admin\n",
    );
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content:
        "User-agent: *\n# Begin OpenNav AI\nContent-signal: search=yes\n# End OpenNav AI\nDisallow: /admin\n",
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PROTECTED_OUTPUT_FILE",
        message:
          "The write planner will not overwrite a caller-owned output file.",
        context: {
          outputDirectory,
          outputFilePath: "robots.txt",
        },
      },
    });
  });

  it("returns exact typed error when multiple contributors target the same output path before reading lazy content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const generatedRobotsProbe = createGeneratedFileProbe(
      "robots.txt",
      "# generated\n",
    );
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: "User-agent: *\n",
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [generatedRobotsProbe.file],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
      sourceReadCount: generatedRobotsProbe.readCount(),
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_DUPLICATE_OUTPUT_FILE_PATH",
        message:
          "Multiple write plan contributors target the same output file path.",
        context: {
          outputFilePath: "robots.txt",
          firstContributor: "generated-file",
          duplicateContributor: "access-guidance-file",
        },
      },
      sourceReadCount: 0,
    });
  });

  it("returns exact typed error when two generated files target the same output path before reading lazy content", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const firstProbe = createGeneratedFileProbe("llms.txt", "# First\n");
    const secondProbe = createGeneratedFileProbe("llms.txt", "# Second\n");
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [firstProbe.file, secondProbe.file],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
      sourceReadCount: {
        first: firstProbe.readCount(),
        second: secondProbe.readCount(),
      },
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_DUPLICATE_OUTPUT_FILE_PATH",
        message:
          "Multiple write plan contributors target the same output file path.",
        context: {
          outputFilePath: "llms.txt",
          firstContributor: "generated-file",
          duplicateContributor: "generated-file",
        },
      },
      sourceReadCount: {
        first: 0,
        second: 0,
      },
    });
  });

  it.each<TraversalCase>([
    {
      outputFilePath: "../llms.txt",
      generatedFiles: [
        createGeneratedFileProbe("../llms.txt", "# Outside\n").file,
      ],
      pageEdits: [],
      accessGuidanceFiles: [],
    },
    {
      outputFilePath: "../index.html",
      generatedFiles: [],
      pageEdits: [
        {
          ...createPageEdit(),
          sourceFilePath: "../index.html",
        },
      ],
      accessGuidanceFiles: [],
    },
    {
      outputFilePath: "../robots.txt",
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [
        {
          outputFilePath: "../robots.txt",
          content: createManagedRobotsBlock("Content-signal: search=yes"),
        },
      ],
    },
  ])("returns exact typed error for path traversal outside the output directory at $outputFilePath", async ({
    outputFilePath,
    generatedFiles,
    pageEdits,
    accessGuidanceFiles,
  }: TraversalCase): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles,
      pageEdits,
      accessGuidanceFiles,
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_OUTPUT_PATH_OUTSIDE_OUTPUT_DIRECTORY",
        message:
          "Write planning can only target files inside the output directory.",
        context: {
          outputDirectory,
          outputFilePath,
        },
      },
    });
  });

  it("returns exact path-kind conflict when a planned generated file path is already a directory", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await mkdir(join(outputDirectory, "docs/api.md"), { recursive: true });
    const markdownProbe = createGeneratedFileProbe("docs/api.md", "# API\n");
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [markdownProbe.file],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
      sourceReadCount: markdownProbe.readCount(),
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PATH_KIND_CONFLICT",
        message: "A planned file path is not a writable file.",
        context: {
          outputDirectory,
          outputFilePath: "docs/api.md",
        },
      },
      sourceReadCount: 0,
    });
  });

  it("returns exact path-kind conflict when an access-guidance file path is already a directory", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await mkdir(join(outputDirectory, "robots.txt"), { recursive: true });
    const accessGuidanceFile: AccessGuidanceFile = {
      outputFilePath: "robots.txt",
      content: createManagedRobotsBlock("Content-signal: search=yes"),
    };
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [],
      accessGuidanceFiles: [accessGuidanceFile],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PATH_KIND_CONFLICT",
        message: "A planned file path is not a writable file.",
        context: {
          outputDirectory,
          outputFilePath: "robots.txt",
        },
      },
    });
  });

  it("returns exact path-kind conflict when a planned HTML page edit target is already a directory", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await mkdir(join(outputDirectory, "index.html"), { recursive: true });
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [createPageEdit()],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PATH_KIND_CONFLICT",
        message: "A planned file path is not a writable file.",
        context: {
          outputDirectory,
          outputFilePath: "index.html",
        },
      },
    });
  });

  it("returns exact path-kind conflict when a needed parent directory path is already a file", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    await writeOutputFile(outputDirectory, "docs", "not a directory\n");
    const markdownProbe = createGeneratedFileProbe("docs/api.md", "# API\n");
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [markdownProbe.file],
      pageEdits: [],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
      sourceReadCount: markdownProbe.readCount(),
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PATH_KIND_CONFLICT",
        message: "A parent path needed for a planned file is already a file.",
        context: {
          outputDirectory,
          outputFilePath: "docs/api.md",
        },
      },
      sourceReadCount: 0,
    });
  });

  it("returns exact typed error when a planned HTML page edit target is missing", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();
    const builder = new WritePlanBuilder();

    const result: Result<WritePlanResult, OpenNavError> = await builder.build({
      outputDirectory,
      generatedFiles: [],
      pageEdits: [createPageEdit()],
      accessGuidanceFiles: [],
    });

    expect({
      isErr: result.isErr(),
      error: result.isErr() ? result.error : undefined,
    }).toEqual({
      isErr: true,
      error: {
        code: "WRITE_PLAN_PAGE_EDIT_TARGET_MISSING",
        message:
          "A planned HTML page edit target is missing from the output directory.",
        context: {
          outputDirectory,
          outputFilePath: "index.html",
        },
      },
    });
  });
});
