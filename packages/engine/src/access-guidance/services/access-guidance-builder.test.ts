import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AccessGuidanceBuilder } from "./access-guidance-builder";

const buildFingerprint = "sha256:build";

describe("AccessGuidanceBuilder", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns no files when Content Signals are not configured", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-access-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, "robots.txt"),
      "User-agent: *\nDisallow: /admin\n",
      "utf8",
    );
    const builder = new AccessGuidanceBuilder();
    const result = await builder.build({
      buildFingerprint,
      outputDirectory,
      sourceFileReferences: [{ filePath: "robots.txt", kind: "robots" }],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [],
        warnings: [],
      });
    }
  });

  it("plans exact robots.txt Content Signals guidance from an existing source file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-access-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, "robots.txt"),
      "User-agent: *\nDisallow: /admin\n",
      "utf8",
    );
    const builder = new AccessGuidanceBuilder();
    const result = await builder.build({
      buildFingerprint,
      outputDirectory,
      sourceFileReferences: [{ filePath: "robots.txt", kind: "robots" }],
      contentSignals: {
        search: "allow",
        aiInput: "allow",
        aiTrain: "disallow",
      },
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        files: [
          {
            outputFilePath: "robots.txt",
            content:
              'User-agent: *\n# Begin OpenNav AI\n# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:build" manifest="/.well-known/opennav.json"\nContent-signal: search=yes, ai-input=yes, ai-train=no\n# End OpenNav AI\nDisallow: /admin\n',
          },
        ],
        warnings: [],
      });
    }
  });

  it("returns an exact read error when a robots.txt reference is missing", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-access-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const sourceFilePath = "robots.txt";
    await mkdir(outputDirectory);
    const builder = new AccessGuidanceBuilder();
    const result = await builder.build({
      buildFingerprint,
      outputDirectory,
      sourceFileReferences: [{ filePath: sourceFilePath, kind: "robots" }],
      contentSignals: {
        search: "allow",
        aiInput: "allow",
        aiTrain: "disallow",
      },
    });

    expect(result.isErr()).toEqual(true);
    if (result.isErr()) {
      expect(result.error).toEqual({
        code: "ENGINE_FILE_READ_FAILED",
        message: "The engine could not read the built site file.",
        context: {
          outputDirectory,
          filePath: sourceFilePath,
          cause: `ENOENT: no such file or directory, open '${join(
            outputDirectory,
            sourceFilePath,
          )}'`,
        },
      });
    }
  });
});
