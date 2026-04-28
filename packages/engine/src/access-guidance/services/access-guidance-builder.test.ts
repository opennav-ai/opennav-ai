import { describe, expect, it } from "vitest";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import { AccessGuidanceBuilder } from "./access-guidance-builder";

describe("AccessGuidanceBuilder", (): void => {
  it("returns no files when Content Signals are not configured", (): void => {
    const builder = new AccessGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      robotsTxtFile: {
        filePath: "robots.txt",
        content: "User-agent: *\nDisallow: /admin\n",
      },
    });

    expect(result).toEqual({
      files: [],
      warnings: [],
    });
  });

  it("plans exact robots.txt Content Signals guidance when configured", (): void => {
    const builder = new AccessGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      contentSignals: {
        search: "allow",
        aiInput: "allow",
        aiTrain: "disallow",
      },
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "robots.txt",
          content:
            "User-agent: *\nContent-signal: search=yes, ai-input=yes, ai-train=no\n",
        },
      ],
      warnings: [],
    });
  });
});
