import { describe, expect, it } from "vitest";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import { RobotsTxtGuidanceBuilder } from "./robots-txt-guidance-builder";

const contentSignalLine =
  "Content-signal: search=yes, ai-input=yes, ai-train=no";

describe("RobotsTxtGuidanceBuilder", (): void => {
  it("creates exact robots.txt content when Content Signals are configured and no robots file exists", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      contentSignalLine,
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

  it("inserts exact Content Signals after an existing wildcard user-agent", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      robotsTxtFile: {
        filePath: "robots.txt",
        content: "User-agent: *\nDisallow: /admin\n",
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "robots.txt",
          content:
            "User-agent: *\nContent-signal: search=yes, ai-input=yes, ai-train=no\nDisallow: /admin\n",
        },
      ],
      warnings: [],
    });
  });

  it("appends an exact wildcard group when existing robots content has no wildcard user-agent", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      robotsTxtFile: {
        filePath: "robots.txt",
        content: "User-agent: Googlebot\nDisallow: /private\n",
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "robots.txt",
          content:
            "User-agent: Googlebot\nDisallow: /private\n\nUser-agent: *\nContent-signal: search=yes, ai-input=yes, ai-train=no\n",
        },
      ],
      warnings: [],
    });
  });

  it("returns no files when Content Signals are not configured", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
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

  it("does not duplicate existing matching Content Signals", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      robotsTxtFile: {
        filePath: "robots.txt",
        content:
          "User-agent: *\nContent-signal: search=yes, ai-input=yes, ai-train=no\nDisallow: /admin\n",
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [],
      warnings: [],
    });
  });

  it("returns an exact warning when existing Content Signals conflict with configured guidance", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      robotsTxtFile: {
        filePath: "robots.txt",
        content:
          "User-agent: *\nContent-signal: search=yes, ai-input=no, ai-train=no\n",
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "ACCESS_GUIDANCE_CONTENT_SIGNALS_CONFLICT",
          message:
            "Existing robots.txt Content Signals differ from the configured policy.",
          context: {
            filePath: "robots.txt",
            configuredContentSignalLine: contentSignalLine,
            existingContentSignalLines: [
              "Content-signal: search=yes, ai-input=no, ai-train=no",
            ],
          },
        },
      ],
    });
  });
});
