import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import { OpenNavStaticSite } from "./index";
import type { OpenNavBuildResult, OpenNavError } from "./types/open-nav-build";

describe("OpenNavStaticSite", (): void => {
  let fixtureDirectory: string | undefined;
  const buildFingerprint = "sha256:0328bd23bfdb";

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  async function createStaticOutputDirectory(): Promise<string> {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-static-site-"));
    const outputDirectory = join(fixtureDirectory, "dist");

    await writeOutputFile(
      outputDirectory,
      "index.html",
      '<!doctype html><html lang="en"><head><title>Home</title><meta name="description" content="Start here."></head><body><main><h1>Home</h1><p>Start here.</p></main></body></html>',
    );
    await writeOutputFile(
      outputDirectory,
      "docs/about.html",
      '<!doctype html><html lang="en"><head><title>About</title><meta name="description" content="Learn about OpenNav."></head><body><main><h1>About</h1><p>Learn about OpenNav.</p></main></body></html>',
    );
    await writeOutputFile(outputDirectory, "assets/logo.svg", "<svg></svg>");

    return outputDirectory;
  }

  async function pathExists(filePath: string): Promise<boolean> {
    return await access(filePath).then(
      (): boolean => true,
      (): boolean => false,
    );
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

  it("discovers static files and returns an exact dry-run report without writing files", async (): Promise<void> => {
    const outputDirectory = await createStaticOutputDirectory();
    const staticSite = new OpenNavStaticSite({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      outputDirectory,
    });

    const result: Result<OpenNavBuildResult, OpenNavError> =
      await staticSite.build({ dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        generatedPathExists: {
          llmsTxt: await pathExists(join(outputDirectory, "llms.txt")),
          indexMarkdown: await pathExists(join(outputDirectory, "index.md")),
          aboutMarkdown: await pathExists(
            join(outputDirectory, "docs/about.md"),
          ),
          manifest: await pathExists(
            join(outputDirectory, ".well-known/opennav.json"),
          ),
        },
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "docs/about.md",
            "index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: ["docs/about.html", "index.html"],
          skippedFilePaths: ["assets/logo.svg"],
          warnings: [
            {
              code: "ENGINE_FILE_UNSUPPORTED",
              message: "The engine skipped an unsupported built site file.",
              context: {
                filePath: "assets/logo.svg",
                kind: "unsupported",
              },
            },
          ],
        },
        generatedPathExists: {
          llmsTxt: false,
          indexMarkdown: false,
          aboutMarkdown: false,
          manifest: false,
        },
      });
    }
  });

  it("writes OpenNav files by default when dryRun is omitted", async (): Promise<void> => {
    const outputDirectory = await createStaticOutputDirectory();
    const staticSite = new OpenNavStaticSite({
      siteName: "Example Docs",
      siteUrl: "https://example.com",
      outputDirectory,
    });

    const result: Result<OpenNavBuildResult, OpenNavError> =
      await staticSite.build();

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        generatedContent: {
          llmsTxt: await readFile(join(outputDirectory, "llms.txt"), "utf8"),
          indexMarkdown: await readFile(
            join(outputDirectory, "index.md"),
            "utf8",
          ),
          aboutMarkdown: await readFile(
            join(outputDirectory, "docs/about.md"),
            "utf8",
          ),
        },
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "docs/about.md",
            "index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: ["docs/about.html", "index.html"],
          skippedFilePaths: ["assets/logo.svg"],
          warnings: [
            {
              code: "ENGINE_FILE_UNSUPPORTED",
              message: "The engine skipped an unsupported built site file.",
              context: {
                filePath: "assets/logo.svg",
                kind: "unsupported",
              },
            },
          ],
        },
        generatedContent: {
          llmsTxt: `# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Start here.\n\n## Docs\n\n- [About](https://example.com/docs/about.md): Learn about OpenNav.\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
          indexMarkdown: `# Home\n\nStart here.\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
          aboutMarkdown: `# About\n\nLearn about OpenNav.\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
        },
      });
    }
  });

  it("normalizes schemeless site URLs before generating public URLs", async (): Promise<void> => {
    const outputDirectory = await createStaticOutputDirectory();
    const staticSite = new OpenNavStaticSite({
      siteName: "Example Docs",
      siteUrl: "example.com",
      outputDirectory,
    });

    const result: Result<OpenNavBuildResult, OpenNavError> =
      await staticSite.build();

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        warnings: result.value.warnings,
        llmsTxt: await readFile(join(outputDirectory, "llms.txt"), "utf8"),
      }).toEqual({
        warnings: [
          {
            code: "SITE_URL_PROTOCOL_ADDED",
            message: "OpenNav added https:// to the configured siteUrl.",
            context: {
              originalBaseUrl: "example.com",
              normalizedBaseUrl: "https://example.com",
            },
          },
          {
            code: "ENGINE_FILE_UNSUPPORTED",
            message: "The engine skipped an unsupported built site file.",
            context: {
              filePath: "assets/logo.svg",
              kind: "unsupported",
            },
          },
        ],
        llmsTxt: `# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Start here.\n\n## Docs\n\n- [About](https://example.com/docs/about.md): Learn about OpenNav.\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${buildFingerprint}" manifest="/.well-known/opennav.json" -->\n`,
      });
    }
  });
});
