import { err, ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { EngineFilePath } from "../../types/engine-file-path";
import type { AgentContentFile } from "../types/agent-content-file";
import type { AgentContentFileContent } from "../types/agent-content-file-content";
import { LlmsFilePlacementBuilder } from "./llms-file-placement-builder";

interface ContentProbe {
  readonly file: AgentContentFile;
  readonly readCount: () => number;
}

function createContentProbe(
  outputFilePath: EngineFilePath,
  contentResult: Result<AgentContentFileContent, OpenNavError>,
): ContentProbe {
  let readCount = 0;

  return {
    file: {
      outputFilePath,
      getContent: async (): Promise<
        Result<AgentContentFileContent, OpenNavError>
      > => {
        readCount += 1;

        return contentResult;
      },
    },
    readCount: (): number => readCount,
  };
}

async function getContentResults(
  files: readonly AgentContentFile[],
): Promise<readonly unknown[]> {
  const contentResults = await Promise.all(
    files.map(
      async (
        file: AgentContentFile,
      ): Promise<Result<AgentContentFileContent, OpenNavError>> =>
        file.getContent(),
    ),
  );

  return contentResults.map(
    (contentResult: Result<AgentContentFileContent, OpenNavError>): unknown =>
      contentResult.isOk()
        ? {
            isOk: true,
            value: contentResult.value,
          }
        : {
            isOk: false,
            error: contentResult.error,
          },
  );
}

function getFilePaths(files: readonly AgentContentFile[]): readonly string[] {
  return files.map((file: AgentContentFile): string => file.outputFilePath);
}

describe("LlmsFilePlacementBuilder", (): void => {
  it("plans root and well-known llms.txt placements without reading content", (): void => {
    const contentProbe = createContentProbe(
      "llms.txt",
      ok({
        content: "# Example Docs\n",
        warnings: [],
      }),
    );
    const builder = new LlmsFilePlacementBuilder();

    const files = builder.build(contentProbe.file);

    expect({
      filePaths: getFilePaths(files),
      sourceReadCount: contentProbe.readCount(),
    }).toEqual({
      filePaths: ["llms.txt", ".well-known/llms.txt"],
      sourceReadCount: 0,
    });
  });

  it("reuses exact lazy llms-full.txt content and warnings for both placements", async (): Promise<void> => {
    const tokenLimitWarning: OpenNavError = {
      code: "LLMS_FULL_TXT_TOKEN_LIMIT_REACHED",
      message:
        "The generated llms-full.txt file stopped before adding content that would exceed the configured token limit.",
      context: {
        outputFilePath: "llms-full.txt",
        maxContentTokens: 10,
        actualContentTokens: 10,
        omittedPageCount: 1,
        omittedPageSourceFilePaths: ["docs/api.html"],
      },
    };
    const contentProbe = createContentProbe(
      "llms-full.txt",
      ok({
        content: "# Example Docs\n\n## Root\n",
        warnings: [tokenLimitWarning],
      }),
    );
    const builder = new LlmsFilePlacementBuilder();

    const files = builder.build(contentProbe.file);
    const contentResults = await getContentResults(files);

    expect({
      filePaths: getFilePaths(files),
      contentResults,
      sourceReadCount: contentProbe.readCount(),
    }).toEqual({
      filePaths: ["llms-full.txt", ".well-known/llms-full.txt"],
      contentResults: [
        {
          isOk: true,
          value: {
            content: "# Example Docs\n\n## Root\n",
            warnings: [tokenLimitWarning],
          },
        },
        {
          isOk: true,
          value: {
            content: "# Example Docs\n\n## Root\n",
            warnings: [tokenLimitWarning],
          },
        },
      ],
      sourceReadCount: 1,
    });
  });

  it("reuses exact lazy errors for both placements", async (): Promise<void> => {
    const sourceReadError: OpenNavError = {
      code: "ENGINE_FILE_READ_FAILED",
      message: "Could not read the source page.",
      context: {
        sourceFilePath: "docs/api.html",
      },
    };
    const contentProbe = createContentProbe(
      "llms-full.txt",
      err(sourceReadError),
    );
    const builder = new LlmsFilePlacementBuilder();

    const files = builder.build(contentProbe.file);
    const contentResults = await getContentResults(files);

    expect({
      filePaths: getFilePaths(files),
      contentResults,
      sourceReadCount: contentProbe.readCount(),
    }).toEqual({
      filePaths: ["llms-full.txt", ".well-known/llms-full.txt"],
      contentResults: [
        {
          isOk: false,
          error: sourceReadError,
        },
        {
          isOk: false,
          error: sourceReadError,
        },
      ],
      sourceReadCount: 1,
    });
  });
});
