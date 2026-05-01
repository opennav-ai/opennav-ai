import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { StaticHeadersEngine } from "./static-headers-engine";

const BUILD_FINGERPRINT = "sha256:build";
const MANAGED_BLOCK = `# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json"
/*.md
  Content-Type: text/markdown; charset=utf-8
  X-Content-Type-Options: nosniff

/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  X-Content-Type-Options: nosniff

/.well-known/opennav.json
  Content-Type: application/json; charset=utf-8
  X-Content-Type-Options: nosniff
# End OpenNav AI
`;

describe("StaticHeadersEngine", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  async function createOutputDirectory(): Promise<string> {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-static-headers-"));

    return join(fixtureDirectory, "dist");
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

  it("keeps file paths unchanged when static headers are not enabled", (): void => {
    const result = new StaticHeadersEngine().getContentFilePaths({
      outputDirectory: "dist",
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["index.html", "_headers"]);
    }
  });

  it("filters Cloudflare headers from content file paths when static headers are enabled", (): void => {
    const result = new StaticHeadersEngine().getContentFilePaths({
      outputDirectory: "dist",
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
      staticHeaders: {
        enabled: true,
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["index.html"]);
    }
  });

  it("returns a typed error when static headers are enabled without a platform", (): void => {
    const result = new StaticHeadersEngine().getContentFilePaths({
      outputDirectory: "dist",
      filePaths: ["index.html"],
      staticHeaders: {
        enabled: true,
      },
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "STATIC_HEADERS_PLATFORM_REQUIRED",
        message: "OpenNav needs `platform` when static headers are enabled.",
        context: {
          staticHeaders: {
            enabled: true,
          },
        },
      });
    }
  });

  it("returns a typed error when the platform is not supported", (): void => {
    const result = new StaticHeadersEngine().getContentFilePaths({
      outputDirectory: "dist",
      filePaths: ["index.html"],
      platform: "somewhere-else",
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "STATIC_HEADERS_PLATFORM_UNSUPPORTED",
        message:
          'Unsupported static headers platform "somewhere-else". Supported platforms: cloudflare-pages. Pass a supported platform, or omit platform when you do not need platform-specific artifacts.',
        context: {
          platform: "somewhere-else",
          supportedPlatforms: ["cloudflare-pages"],
        },
      });
    }
  });

  it("does not build files when static headers are disabled", async (): Promise<void> => {
    const result = await new StaticHeadersEngine().build({
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory: "dist",
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
      staticHeaders: {
        enabled: false,
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [],
        warnings: [],
      });
    }
  });

  it("does not build files when the platform is supported but headers are not enabled", async (): Promise<void> => {
    const result = await new StaticHeadersEngine().build({
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory: "dist",
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [],
        warnings: [],
      });
    }
  });

  it("returns a typed build error when enabled static headers use an unsupported platform", async (): Promise<void> => {
    const result = await new StaticHeadersEngine().build({
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory: "dist",
      filePaths: ["index.html"],
      platform: "somewhere-else",
      staticHeaders: {
        enabled: true,
      },
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "STATIC_HEADERS_PLATFORM_UNSUPPORTED",
        message:
          'Unsupported static headers platform "somewhere-else". Supported platforms: cloudflare-pages. Pass a supported platform, or omit platform when you do not need platform-specific artifacts.',
        context: {
          platform: "somewhere-else",
          supportedPlatforms: ["cloudflare-pages"],
        },
      });
    }
  });

  it("builds Cloudflare Pages headers with existing caller rules preserved", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();

    await writeOutputFile(
      outputDirectory,
      "_headers",
      "/assets/*\n  Cache-Control: public, max-age=31536000\n",
    );

    const result = await new StaticHeadersEngine().build({
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory,
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
      staticHeaders: {
        enabled: true,
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [
          {
            outputFilePath: "_headers",
            content: `/assets/*
  Cache-Control: public, max-age=31536000

${MANAGED_BLOCK}`,
          },
        ],
        warnings: [],
      });
    }
  });

  it("leaves existing Cloudflare headers untouched when caller routes overlap", async (): Promise<void> => {
    const outputDirectory = await createOutputDirectory();

    await writeOutputFile(
      outputDirectory,
      "_headers",
      "/llms.txt\n  Cache-Control: no-store\n",
    );

    const result = await new StaticHeadersEngine().build({
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory,
      filePaths: ["index.html", "_headers"],
      platform: "cloudflare-pages",
      staticHeaders: {
        enabled: true,
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [],
        warnings: [
          {
            code: "STATIC_HEADERS_ROUTE_CONFLICT",
            message:
              "Existing _headers route rules overlap with OpenNav static headers.",
            context: {
              filePath: "_headers",
              conflictingRules: ["/llms.txt"],
            },
          },
        ],
      });
    }
  });
});
