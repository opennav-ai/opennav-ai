import { ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { AgentContentFileContent } from "../../agent-content/types/agent-content-file-content";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineExecuteResult } from "../../types/engine-execute-result";
import type { WriteFileContentProvider } from "../../write-plan/types/write-file-content-provider";
import type { WritePlan } from "../../write-plan/types/write-plan";
import { BuildResultReporter } from "./build-result-reporter";

interface ContentProviderProbe {
  readonly contentProvider: WriteFileContentProvider;
  readonly readCount: () => number;
}

const UNSUPPORTED_FILE_WARNING: OpenNavError = {
  code: "ENGINE_FILE_UNSUPPORTED",
  message: "The engine skipped an unsupported built site file.",
  context: {
    filePath: "image.png",
    kind: "unsupported",
  },
};

const OPTIONAL_LINK_WARNING: OpenNavError = {
  code: "RESOURCE_LINK_HTML_HEAD_MISSING",
  message: "The engine skipped HTML resource links for a page without a head.",
  context: {
    sourceFilePath: "docs/no-head.html",
  },
};

const FATAL_ERROR: OpenNavError = {
  code: "WRITE_PLAN_PROTECTED_FILE",
  message: "A planned generated file would overwrite caller-owned content.",
  context: {
    outputFilePath: "llms.txt",
  },
};

function createContentProviderProbe(content: string): ContentProviderProbe {
  let readCount = 0;

  return {
    contentProvider: {
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

describe("BuildResultReporter", (): void => {
  it("returns an exact dry-run report for planned created and modified files without reading lazy content", (): void => {
    const llmsTxtProbe = createContentProviderProbe("# Example Docs\n");
    const robotsTxtProbe = createContentProviderProbe(
      "User-agent: *\nAllow: /\n",
    );
    const manifestProbe = createContentProviderProbe('{"opennav":true}\n');
    const writePlan: WritePlan = {
      operations: [
        {
          kind: "create-file",
          outputFilePath: "llms.txt",
          contentProvider: llmsTxtProbe.contentProvider,
        },
        {
          kind: "edit-html-page",
          outputFilePath: "index.html",
          headInsertionOffset: 12,
          headLinkMarkup:
            '\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n',
          links: [
            {
              relation: "index",
              mediaType: "text/plain",
              href: "https://example.com/llms.txt",
              title: "LLMs text site index",
            },
          ],
        },
        {
          kind: "overwrite-file",
          outputFilePath: "robots.txt",
          contentProvider: robotsTxtProbe.contentProvider,
        },
        {
          kind: "create-file",
          outputFilePath: ".well-known/opennav.json",
          contentProvider: manifestProbe.contentProvider,
        },
      ],
    };
    const reporter = new BuildResultReporter();

    const result: Result<EngineExecuteResult, OpenNavError> =
      reporter.reportDryRun({
        writePlan,
        skippedFilePaths: ["image.png"],
        warnings: [UNSUPPORTED_FILE_WARNING],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        readCounts: {
          llmsTxt: llmsTxtProbe.readCount(),
          robotsTxt: robotsTxtProbe.readCount(),
          manifest: manifestProbe.readCount(),
        },
      }).toEqual({
        result: {
          createdFilePaths: ["llms.txt", ".well-known/opennav.json"],
          modifiedFilePaths: ["index.html", "robots.txt"],
          skippedFilePaths: ["image.png"],
          warnings: [UNSUPPORTED_FILE_WARNING],
        },
        readCounts: {
          llmsTxt: 0,
          robotsTxt: 0,
          manifest: 0,
        },
      });
    }
  });

  it("returns an exact write report for applied created and modified files", (): void => {
    const reporter = new BuildResultReporter();

    const result: Result<EngineExecuteResult, OpenNavError> =
      reporter.reportWrite({
        records: [
          {
            kind: "edited-html-page",
            outputFilePath: "index.html",
          },
          {
            kind: "created-file",
            outputFilePath: "llms.txt",
          },
          {
            kind: "overwritten-file",
            outputFilePath: "robots.txt",
          },
          {
            kind: "created-file",
            outputFilePath: ".well-known/opennav.json",
          },
        ],
        skippedFilePaths: ["robots.txt"],
        warnings: [OPTIONAL_LINK_WARNING],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        createdFilePaths: ["llms.txt", ".well-known/opennav.json"],
        modifiedFilePaths: ["index.html", "robots.txt"],
        skippedFilePaths: ["robots.txt"],
        warnings: [OPTIONAL_LINK_WARNING],
      });
    }
  });

  it("returns an exact warning report for skipped optional files", (): void => {
    const reporter = new BuildResultReporter();

    const result: Result<EngineExecuteResult, OpenNavError> =
      reporter.reportDryRun({
        writePlan: {
          operations: [],
        },
        skippedFilePaths: ["image.png", "docs/no-head.html"],
        warnings: [UNSUPPORTED_FILE_WARNING, OPTIONAL_LINK_WARNING],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        createdFilePaths: [],
        modifiedFilePaths: [],
        skippedFilePaths: ["image.png", "docs/no-head.html"],
        warnings: [UNSUPPORTED_FILE_WARNING, OPTIONAL_LINK_WARNING],
      });
    }
  });

  it("returns an exact failure result for a typed fatal error", (): void => {
    const reporter = new BuildResultReporter();

    const result: Result<EngineExecuteResult, OpenNavError> =
      reporter.reportFailure({
        error: FATAL_ERROR,
      });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual(FATAL_ERROR);
    }
  });

  it("preserves write record and warning order exactly without deduplicating paths", (): void => {
    const firstWarning: OpenNavError = {
      code: "FIRST_WARNING",
      message: "The first warning stayed first.",
      context: {
        outputFilePath: "llms-full.txt",
      },
    };
    const secondWarning: OpenNavError = {
      code: "SECOND_WARNING",
      message: "The second warning stayed second.",
      context: {
        outputFilePath: ".well-known/llms-full.txt",
      },
    };
    const reporter = new BuildResultReporter();

    const result: Result<EngineExecuteResult, OpenNavError> =
      reporter.reportWrite({
        records: [
          {
            kind: "created-file",
            outputFilePath: "llms-full.txt",
          },
          {
            kind: "created-file",
            outputFilePath: "llms-full.txt",
          },
          {
            kind: "edited-html-page",
            outputFilePath: "index.html",
          },
          {
            kind: "edited-html-page",
            outputFilePath: "index.html",
          },
        ],
        skippedFilePaths: ["docs/omitted.md", "docs/omitted.md"],
        warnings: [firstWarning, secondWarning],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        createdFilePaths: ["llms-full.txt", "llms-full.txt"],
        modifiedFilePaths: ["index.html", "index.html"],
        skippedFilePaths: ["docs/omitted.md", "docs/omitted.md"],
        warnings: [firstWarning, secondWarning],
      });
    }
  });
});
