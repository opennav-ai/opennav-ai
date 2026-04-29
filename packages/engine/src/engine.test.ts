import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "./common/types/opennav-error";
import { Engine } from "./engine";
import * as publicExports from "./index";
import type { EngineExecuteInput } from "./types/engine-execute-input";
import type { EngineExecuteResult } from "./types/engine-execute-result";

const PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY = fileURLToPath(
  new URL("../fixtures/phase-1-small-site/dist", import.meta.url),
);

type OutputTree = Readonly<Record<string, OutputTreeEntry>>;
type OutputTreeEntry =
  | {
      readonly kind: "directory";
    }
  | {
      readonly content: string;
      readonly kind: "file";
    };

const OPENNAV_MANAGED_TEXT_FILE_CONTENT =
  '# Stale\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:stale" manifest="/.well-known/opennav.json" -->\n';
const OPENNAV_MANAGED_MANIFEST_CONTENT =
  '{\n  "opennav": true,\n  "build_fingerprint": "sha256:stale"\n}\n';
const REAL_WRITE_BUILD_FINGERPRINT =
  "sha256:72b3983a64ddafeb6875f248f4a686e2e765d7cbd8035c45c7a090c08eb9e125";

describe("Engine", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("is exported from the public package entrypoint", (): void => {
    expect(publicExports.Engine).toEqual(Engine);
  });

  it("keeps Engine as the only runtime export", (): void => {
    expect(Object.keys(publicExports).sort()).toEqual(["Engine"]);
  });

  it("reads built file paths and returns unsupported files as skipped warnings", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const unsupportedFilePath = "image.png";
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, htmlFilePath),
      "<html><head><title>Home</title></head></html>",
      "utf8",
    );
    await writeFile(join(outputDirectory, unsupportedFilePath), "PNG", "utf8");
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [htmlFilePath, unsupportedFilePath],
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        createdFilePaths: [
          "llms.txt",
          ".well-known/llms.txt",
          "index.md",
          "llms-full.txt",
          ".well-known/llms-full.txt",
          ".well-known/opennav.json",
        ],
        modifiedFilePaths: [htmlFilePath],
        skippedFilePaths: [unsupportedFilePath],
        warnings: [
          {
            code: "ENGINE_FILE_UNSUPPORTED",
            message: "The engine skipped an unsupported built site file.",
            context: {
              filePath: unsupportedFilePath,
              kind: "unsupported",
            },
          },
        ],
      });
    }
  });

  it("returns an exact typed error when a built file cannot be read", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "missing.html";
    const absoluteFilePath = join(outputDirectory, filePath);
    await mkdir(outputDirectory);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [filePath],
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "ENGINE_FILE_READ_FAILED",
        message: "The engine could not read the built site file.",
        context: {
          outputDirectory,
          filePath,
          cause: `ENOENT: no such file or directory, access '${absoluteFilePath}'`,
        },
      });
    }
  });

  it("stops a dry run before planning writes when strict validation fails", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "untitled.html";
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, filePath),
      "<html><head></head><body><p>No title here.</p></body></html>",
      "utf8",
    );
    const beforeTree = await readOutputTree(outputDirectory);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [filePath],
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect({
        error: result.error,
        afterTree: await readOutputTree(outputDirectory),
        generatedPathExists: {
          llmsTxt: await pathExists(join(outputDirectory, "llms.txt")),
          wellKnownDirectory: await pathExists(
            join(outputDirectory, ".well-known"),
          ),
          manifest: await pathExists(
            join(outputDirectory, ".well-known/opennav.json"),
          ),
        },
      }).toEqual({
        error: {
          code: "SITE_VALIDATION_PAGE_TITLE_MISSING",
          message: "A page title is required in strict validation mode.",
          context: {
            sourceFilePath: filePath,
            route: "/untitled",
            mode: "strict",
          },
        },
        afterTree: beforeTree,
        generatedPathExists: {
          llmsTxt: false,
          wellKnownDirectory: false,
          manifest: false,
        },
      });
    }
  });

  it("returns exact dry-run warnings from resource links and access guidance", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "no-head.html";
    const robotsFilePath = "robots.txt";
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, htmlFilePath),
      "<title>No Head</title><body><h1>No Head</h1></body>",
      "utf8",
    );
    await writeFile(
      join(outputDirectory, robotsFilePath),
      "User-agent: *\n# Begin OpenNav AI\nContent-signal: search=no\n",
      "utf8",
    );
    const beforeTree = await readOutputTree(outputDirectory);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [htmlFilePath, robotsFilePath],
      accessGuidance: {
        contentSignals: {
          search: "allow",
        },
      },
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        afterTree: await readOutputTree(outputDirectory),
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "no-head.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: [],
          skippedFilePaths: [],
          warnings: [
            {
              code: "RESOURCE_LINK_HTML_HEAD_MISSING",
              message:
                "HTML page does not have a source <head> element for safe resource link insertion.",
              context: {
                sourceFilePath: htmlFilePath,
              },
            },
            {
              code: "ACCESS_GUIDANCE_OPENNAV_MANAGED_BLOCK_INVALID",
              message:
                "Existing robots.txt contains an invalid OpenNav managed block.",
              context: {
                filePath: robotsFilePath,
                beginMarkerCount: 1,
                endMarkerCount: 0,
              },
            },
          ],
        },
        afterTree: beforeTree,
      });
    }
  });

  it("returns exact dry-run Content Signals conflict warning context", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const robotsFilePath = "robots.txt";
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, htmlFilePath),
      "<html><head><title>Home</title></head><body><h1>Home</h1></body></html>",
      "utf8",
    );
    await writeFile(
      join(outputDirectory, robotsFilePath),
      "User-agent: *\nContent-signal: search=no\n",
      "utf8",
    );
    const beforeTree = await readOutputTree(outputDirectory);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [htmlFilePath, robotsFilePath],
      accessGuidance: {
        contentSignals: {
          search: "allow",
        },
      },
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        afterTree: await readOutputTree(outputDirectory),
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: [htmlFilePath],
          skippedFilePaths: [],
          warnings: [
            {
              code: "ACCESS_GUIDANCE_CONTENT_SIGNALS_CONFLICT",
              message:
                "Existing robots.txt Content Signals differ from the configured policy.",
              context: {
                filePath: robotsFilePath,
                configuredContentSignalLine: "Content-signal: search=yes",
                existingContentSignalLines: ["Content-signal: search=no"],
              },
            },
          ],
        },
        afterTree: beforeTree,
      });
    }
  });

  it("returns an exact dry-run report for a small static site without writing files", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await cp(PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY, outputDirectory, {
      recursive: true,
    });
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };
    const beforeTree = await readOutputTree(outputDirectory);

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        afterTree: await readOutputTree(outputDirectory),
        generatedPathExists: {
          llmsTxt: await pathExists(join(outputDirectory, "llms.txt")),
          wellKnownDirectory: await pathExists(
            join(outputDirectory, ".well-known"),
          ),
          wellKnownLlmsTxt: await pathExists(
            join(outputDirectory, ".well-known/llms.txt"),
          ),
          indexMarkdown: await pathExists(join(outputDirectory, "index.md")),
          gettingStartedMarkdown: await pathExists(
            join(outputDirectory, "docs/getting-started/index.md"),
          ),
          apiMarkdown: await pathExists(
            join(outputDirectory, "docs/api/index.md"),
          ),
          llmsFullTxt: await pathExists(join(outputDirectory, "llms-full.txt")),
          wellKnownLlmsFullTxt: await pathExists(
            join(outputDirectory, ".well-known/llms-full.txt"),
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
            "index.md",
            "docs/getting-started/index.md",
            "docs/api/index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: [
            "index.html",
            "docs/getting-started/index.html",
            "docs/api/index.html",
            "robots.txt",
          ],
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
        afterTree: beforeTree,
        generatedPathExists: {
          llmsTxt: false,
          wellKnownDirectory: false,
          wellKnownLlmsTxt: false,
          indexMarkdown: false,
          gettingStartedMarkdown: false,
          apiMarkdown: false,
          llmsFullTxt: false,
          wellKnownLlmsFullTxt: false,
          manifest: false,
        },
      });
    }
  });

  it("writes exact files for a small static site", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await cp(PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY, outputDirectory, {
      recursive: true,
    });
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: false });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        outputTree: await readOutputTree(outputDirectory),
      }).toEqual({
        result: {
          createdFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "index.md",
            "docs/getting-started/index.md",
            "docs/api/index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
          ],
          modifiedFilePaths: [
            "index.html",
            "docs/getting-started/index.html",
            "docs/api/index.html",
            "robots.txt",
          ],
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
        outputTree: createExpectedRealWriteOutputTree(),
      });
    }
  });

  it("overwrites existing OpenNav-managed generated files during a real write", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await cp(PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY, outputDirectory, {
      recursive: true,
    });
    await writeExistingOpenNavGeneratedFiles(outputDirectory, [
      "llms.txt",
      ".well-known/llms.txt",
      "index.md",
      "docs/getting-started/index.md",
      "docs/api/index.md",
      "llms-full.txt",
      ".well-known/llms-full.txt",
      ".well-known/opennav.json",
    ]);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: false });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        outputTree: await readOutputTree(outputDirectory),
      }).toEqual({
        result: {
          createdFilePaths: [],
          modifiedFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "index.md",
            "docs/getting-started/index.md",
            "docs/api/index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
            "index.html",
            "docs/getting-started/index.html",
            "docs/api/index.html",
            "robots.txt",
          ],
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
        outputTree: createExpectedRealWriteOutputTree(),
      });
    }
  });

  it("returns exact dry-run overwrite planning for an existing OpenNav-managed output folder", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-engine-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await cp(PHASE_1_SMALL_SITE_FIXTURE_DIRECTORY, outputDirectory, {
      recursive: true,
    });
    await writeExistingOpenNavGeneratedFiles(outputDirectory, [
      "llms.txt",
      ".well-known/llms.txt",
      "index.md",
      "docs/getting-started/index.md",
      "docs/api/index.md",
      "llms-full.txt",
      ".well-known/llms-full.txt",
      ".well-known/opennav.json",
    ]);
    const input: EngineExecuteInput = {
      siteName: "Example Docs",
      baseUrl: "https://example.com",
      outputDirectory,
      filePaths: [
        "index.html",
        "docs/getting-started/index.html",
        "docs/api/index.html",
        "docs/reference/index.md",
        "robots.txt",
        "assets/logo.svg",
      ],
      accessGuidance: {
        contentSignals: {
          search: "allow",
          aiInput: "allow",
          aiTrain: "disallow",
        },
      },
    };
    const beforeTree = await readOutputTree(outputDirectory);

    const result: Result<EngineExecuteResult, OpenNavError> =
      await Engine.execute(input, { dryRun: true });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect({
        result: result.value,
        afterTree: await readOutputTree(outputDirectory),
      }).toEqual({
        result: {
          createdFilePaths: [],
          modifiedFilePaths: [
            "llms.txt",
            ".well-known/llms.txt",
            "index.md",
            "docs/getting-started/index.md",
            "docs/api/index.md",
            "llms-full.txt",
            ".well-known/llms-full.txt",
            ".well-known/opennav.json",
            "index.html",
            "docs/getting-started/index.html",
            "docs/api/index.html",
            "robots.txt",
          ],
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
        afterTree: beforeTree,
      });
    }
  });
});

function appendRealWriteHtmlMarker(content: string): string {
  return `${content}\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${REAL_WRITE_BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json" -->\n`;
}

function createExpectedApiHtmlContent(): string {
  return '<!doctype html>\n<html lang="en">\n  <head>\n  <link rel="alternate" type="text/markdown" href="https://example.com/docs/api/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n\n    <meta charset="utf-8">\n    <title>API Reference</title>\n    <meta name="description" content="Use the engine from TypeScript.">\n  </head>\n  <body>\n    <main>\n      <h1>API Reference</h1>\n      <p>Use the engine from TypeScript.</p>\n      <a href="/docs/reference/">Reference Notes</a>\n    </main>\n  </body>\n</html>\n';
}

function createExpectedGettingStartedHtmlContent(): string {
  return '<!doctype html>\n<html lang="en">\n  <head>\n  <link rel="alternate" type="text/markdown" href="https://example.com/docs/getting-started/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n\n    <meta charset="utf-8">\n    <title>Getting Started</title>\n    <meta name="description" content="Install and run OpenNav on a static site.">\n  </head>\n  <body>\n    <main>\n      <h1>Getting Started</h1>\n      <p>Install and run OpenNav on a static site.</p>\n      <a href="../api/">API Reference</a>\n    </main>\n  </body>\n</html>\n';
}

function createExpectedHomeHtmlContent(): string {
  return '<!doctype html>\n<html lang="en">\n  <head>\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index">\n\n    <meta charset="utf-8">\n    <title>Home</title>\n    <meta name="description" content="Start here for the OpenNav fixture docs.">\n  </head>\n  <body>\n    <main>\n      <h1>Home</h1>\n      <p>Start here for the OpenNav fixture docs.</p>\n      <a href="/docs/getting-started/">Getting Started</a>\n      <a href="/docs/api/">API</a>\n    </main>\n  </body>\n</html>\n';
}

function createExpectedLlmsFullTxtContent(): string {
  return appendRealWriteHtmlMarker(
    "# Example Docs\n\n## Root\n\n### Home\n\nURL: https://example.com/index.md\n\nStart here for the OpenNav fixture docs.\n\n# Home\n\nStart here for the OpenNav fixture docs.\n\n[Getting Started](https://example.com/docs/getting-started/index.md)\n\n[API](https://example.com/docs/api/index.md)\n\n---\n\n## Docs\n\n### API Reference\n\nURL: https://example.com/docs/api/index.md\n\nUse the engine from TypeScript.\n\n# API Reference\n\nUse the engine from TypeScript.\n\n[Reference Notes](https://example.com/docs/reference/index.md)\n\n---\n\n### Getting Started\n\nURL: https://example.com/docs/getting-started/index.md\n\nInstall and run OpenNav on a static site.\n\n# Getting Started\n\nInstall and run OpenNav on a static site.\n\n[API Reference](https://example.com/docs/api/index.md)\n\n---\n\n### Reference Notes\n\nURL: https://example.com/docs/reference/index.md\n\nThese notes are already available as Markdown.\n\n# Reference Notes\n\nThese notes are already available as Markdown.",
  );
}

function createExpectedLlmsTxtContent(): string {
  return appendRealWriteHtmlMarker(
    "# Example Docs\n\n## Root\n\n- [Home](https://example.com/index.md): Start here for the OpenNav fixture docs.\n\n## Docs\n\n- [API Reference](https://example.com/docs/api/index.md): Use the engine from TypeScript.\n- [Getting Started](https://example.com/docs/getting-started/index.md): Install and run OpenNav on a static site.\n- [Reference Notes](https://example.com/docs/reference/index.md): These notes are already available as Markdown.",
  );
}

function createExpectedMarkdownPageContent(content: string): string {
  return appendRealWriteHtmlMarker(
    `${content}\n\n---\n\nSite index: [llms.txt](https://example.com/llms.txt)`,
  );
}

function createExpectedManifestContent(): string {
  return `{\n  "opennav": true,\n  "version": "1.0",\n  "profile": "static-agent-ready",\n  "site": "https://example.com",\n  "build_fingerprint": "${REAL_WRITE_BUILD_FINGERPRINT}",\n  "spec": "https://opennav.ai/spec/1.0",\n  "artifacts": {\n    "llms_txt": "/llms.txt",\n    "llms_full_txt": "/llms-full.txt",\n    "well_known_llms_txt": "/.well-known/llms.txt",\n    "well_known_llms_full_txt": "/.well-known/llms-full.txt"\n  },\n  "capabilities": {\n    "clean_markdown": true,\n    "llms_txt": true,\n    "llms_full_txt": true,\n    "html_resource_links": true,\n    "content_signals": true\n  }\n}\n`;
}

function createExpectedRealWriteOutputTree(): OutputTree {
  const llmsFullTxtContent = createExpectedLlmsFullTxtContent();
  const llmsTxtContent = createExpectedLlmsTxtContent();

  return {
    ".well-known": {
      kind: "directory",
    },
    ".well-known/llms-full.txt": {
      content: llmsFullTxtContent,
      kind: "file",
    },
    ".well-known/llms.txt": {
      content: llmsTxtContent,
      kind: "file",
    },
    ".well-known/opennav.json": {
      content: createExpectedManifestContent(),
      kind: "file",
    },
    assets: {
      kind: "directory",
    },
    "assets/logo.svg": {
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">\n  <title>Fixture Logo</title>\n  <rect width="16" height="16" fill="#111111"/>\n</svg>\n',
      kind: "file",
    },
    docs: {
      kind: "directory",
    },
    "docs/api": {
      kind: "directory",
    },
    "docs/api/index.html": {
      content: createExpectedApiHtmlContent(),
      kind: "file",
    },
    "docs/api/index.md": {
      content: createExpectedMarkdownPageContent(
        "# API Reference\n\nUse the engine from TypeScript.\n\n[Reference Notes](https://example.com/docs/reference/index.md)",
      ),
      kind: "file",
    },
    "docs/getting-started": {
      kind: "directory",
    },
    "docs/getting-started/index.html": {
      content: createExpectedGettingStartedHtmlContent(),
      kind: "file",
    },
    "docs/getting-started/index.md": {
      content: createExpectedMarkdownPageContent(
        "# Getting Started\n\nInstall and run OpenNav on a static site.\n\n[API Reference](https://example.com/docs/api/index.md)",
      ),
      kind: "file",
    },
    "docs/reference": {
      kind: "directory",
    },
    "docs/reference/index.md": {
      content:
        "# Reference Notes\n\nThese notes are already available as Markdown.\n",
      kind: "file",
    },
    "index.html": {
      content: createExpectedHomeHtmlContent(),
      kind: "file",
    },
    "index.md": {
      content: createExpectedMarkdownPageContent(
        "# Home\n\nStart here for the OpenNav fixture docs.\n\n[Getting Started](https://example.com/docs/getting-started/index.md)\n\n[API](https://example.com/docs/api/index.md)",
      ),
      kind: "file",
    },
    "llms-full.txt": {
      content: llmsFullTxtContent,
      kind: "file",
    },
    "llms.txt": {
      content: llmsTxtContent,
      kind: "file",
    },
    "robots.txt": {
      content: `User-agent: *\n# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="${REAL_WRITE_BUILD_FINGERPRINT}" manifest="/.well-known/opennav.json"\nContent-signal: search=yes, ai-input=yes, ai-train=no\n# End OpenNav AI\nAllow: /\n`,
      kind: "file",
    },
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
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

async function readOutputTree(outputDirectory: string): Promise<OutputTree> {
  const tree: Record<string, OutputTreeEntry> = {};
  await readOutputTreeEntries(outputDirectory, "", tree);

  return Object.fromEntries(
    Object.entries(tree).sort(([firstPath], [secondPath]): number =>
      firstPath.localeCompare(secondPath),
    ),
  );
}

async function readOutputTreeEntries(
  outputDirectory: string,
  relativeDirectoryPath: string,
  tree: Record<string, OutputTreeEntry>,
): Promise<void> {
  const directoryPath =
    relativeDirectoryPath === ""
      ? outputDirectory
      : join(outputDirectory, relativeDirectoryPath);
  const entries = await readdir(directoryPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const outputPath =
      relativeDirectoryPath === ""
        ? entry.name
        : `${relativeDirectoryPath}/${entry.name}`;

    if (entry.isDirectory()) {
      tree[outputPath] = {
        kind: "directory",
      };
      await readOutputTreeEntries(outputDirectory, outputPath, tree);
      continue;
    }

    tree[outputPath] = {
      content: await readFile(join(outputDirectory, outputPath), "utf8"),
      kind: "file",
    };
  }
}

async function writeExistingOpenNavGeneratedFiles(
  outputDirectory: string,
  filePaths: readonly string[],
): Promise<void> {
  for (const filePath of filePaths) {
    await mkdir(dirname(join(outputDirectory, filePath)), { recursive: true });
    await writeFile(
      join(outputDirectory, filePath),
      filePath === ".well-known/opennav.json"
        ? OPENNAV_MANAGED_MANIFEST_CONTENT
        : OPENNAV_MANAGED_TEXT_FILE_CONTENT,
      "utf8",
    );
  }
}
