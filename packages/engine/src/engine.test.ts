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
