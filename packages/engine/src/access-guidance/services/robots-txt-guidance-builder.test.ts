import { describe, expect, it } from "vitest";
import type { AccessGuidanceBuildResult } from "../types/access-guidance-build-result";
import { RobotsTxtGuidanceBuilder } from "./robots-txt-guidance-builder";

const contentSignalLine =
  "Content-signal: search=yes, ai-input=yes, ai-train=no";
const changedContentSignalLine =
  "Content-signal: search=yes, ai-input=no, ai-train=no";
const buildFingerprint = "sha256:build";

function createManagedContentSignalBlock(line: string): string {
  return `# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json"\n${line}\n# End OpenNav AI\n`;
}

function createManagedWildcardGroupBlock(line: string): string {
  return `# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json"\nUser-agent: *\n${line}\n# End OpenNav AI\n`;
}

describe("RobotsTxtGuidanceBuilder", (): void => {
  it("creates exact robots.txt content when Content Signals are configured and no robots file exists", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "robots.txt",
          content: createManagedWildcardGroupBlock(contentSignalLine),
        },
      ],
      warnings: [],
    });
  });

  it("inserts exact Content Signals after an existing wildcard user-agent", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
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
          content: `User-agent: *\n${createManagedContentSignalBlock(
            contentSignalLine,
          )}Disallow: /admin\n`,
        },
      ],
      warnings: [],
    });
  });

  it("appends an exact wildcard group when existing robots content has no wildcard user-agent", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
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
          content: `User-agent: Googlebot\nDisallow: /private\n\n${createManagedWildcardGroupBlock(
            contentSignalLine,
          )}`,
        },
      ],
      warnings: [],
    });
  });

  it("returns no files when Content Signals are not configured", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
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

  it("does not duplicate existing matching OpenNav managed Content Signals block", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
      robotsTxtFile: {
        filePath: "robots.txt",
        content: `User-agent: *\n${createManagedContentSignalBlock(
          contentSignalLine,
        )}Disallow: /admin\n`,
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [],
      warnings: [],
    });
  });

  it("replaces an existing valid OpenNav managed Content Signals block on rerun", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
      robotsTxtFile: {
        filePath: "robots.txt",
        content: `User-agent: *\n${createManagedContentSignalBlock(
          contentSignalLine,
        )}Disallow: /admin\n`,
      },
      contentSignalLine: changedContentSignalLine,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "robots.txt",
          content: `User-agent: *\n${createManagedContentSignalBlock(
            changedContentSignalLine,
          )}Disallow: /admin\n`,
        },
      ],
      warnings: [],
    });
  });

  it("returns an exact warning when existing Content Signals conflict with configured guidance", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
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

  it("returns an exact warning when an OpenNav managed block is malformed", (): void => {
    const builder = new RobotsTxtGuidanceBuilder();
    const result: AccessGuidanceBuildResult = builder.build({
      buildFingerprint,
      robotsTxtFile: {
        filePath: "robots.txt",
        content:
          'User-agent: *\n# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\nContent-signal: search=yes\nDisallow: /admin\n',
      },
      contentSignalLine,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "ACCESS_GUIDANCE_OPENNAV_MANAGED_BLOCK_INVALID",
          message:
            "Existing robots.txt contains an invalid OpenNav managed block.",
          context: {
            filePath: "robots.txt",
            beginMarkerCount: 1,
            endMarkerCount: 0,
          },
        },
      ],
    });
  });
});
