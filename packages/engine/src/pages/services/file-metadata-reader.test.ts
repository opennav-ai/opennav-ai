import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { FileMetadataReadResult } from "../types/file-metadata-read-result";
import { FileMetadataReader } from "./file-metadata-reader";

describe("FileMetadataReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact page data for HTML and Markdown files", async (): Promise<void> => {
    const htmlFilePath = "index.html";
    const markdownFilePath = "docs/api.md";
    const htmlContent = [
      "<html>",
      "<head>",
      "<title>Home</title>",
      '<meta name="description" content="Welcome to OpenNav AI.">',
      "</head>",
      "<body><h1>Docs Home</h1></body>",
      "</html>",
    ].join("");
    const markdownContent = "# API\n\nUse the OpenNav AI engine.";
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-metadata-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await writeOutputFile(outputDirectory, htmlFilePath, htmlContent);
    await writeOutputFile(outputDirectory, markdownFilePath, markdownContent);

    const reader = new FileMetadataReader();
    const result: Result<FileMetadataReadResult, OpenNavError> =
      await reader.read({
        baseUrl: "https://example.com",
        outputDirectory,
        fileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: markdownFilePath,
            kind: "markdown",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        fingerprintFiles: [
          {
            filePath: htmlFilePath,
            contentFingerprint:
              "sha256:fceca6542912d14543b006c101ee29aa11372becd631041f1c29bbc3584f3592",
          },
          {
            filePath: markdownFilePath,
            contentFingerprint:
              "sha256:b4fe81ff885db3088581412f7da28fefcdeb166bc8912d7b7da3246cbbf88ea7",
          },
        ],
        pageMetadata: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: "Welcome to OpenNav AI.",
          },
          {
            sourceFilePath: markdownFilePath,
            sourceContentType: "markdown",
            route: "/docs/api",
            canonicalUrl: "https://example.com/docs/api",
            title: "API",
            description: "Use the OpenNav AI engine.",
          },
        ],
        sourceFileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: markdownFilePath,
            kind: "markdown",
          },
        ],
      });
    }
  });

  it("ignores files that cannot produce page metadata", async (): Promise<void> => {
    const htmlFilePath = "docs/index.html";
    const robotsFilePath = "robots.txt";
    const htmlContent = "<html><head><title>Docs</title></head></html>";
    const robotsContent = "User-agent: *\nAllow: /";
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-metadata-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await writeOutputFile(outputDirectory, htmlFilePath, htmlContent);
    await writeOutputFile(outputDirectory, robotsFilePath, robotsContent);

    const reader = new FileMetadataReader();
    const result: Result<FileMetadataReadResult, OpenNavError> =
      await reader.read({
        baseUrl: "https://example.com/base/",
        outputDirectory,
        fileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: robotsFilePath,
            kind: "robots",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        fingerprintFiles: [
          {
            filePath: htmlFilePath,
            contentFingerprint:
              "sha256:52c3d91b3f4f53fbc5e582763554c1d0cd77f81034383fcc8dfab4c1579cc048",
          },
          {
            filePath: robotsFilePath,
            contentFingerprint:
              "sha256:44f3f8eafdf064cf69acb05f23ee4dfc9ab5b3d67d81c64246bc29f7e438789a",
          },
        ],
        pageMetadata: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/docs/",
            canonicalUrl: "https://example.com/base/docs/",
            title: "Docs",
            description: undefined,
          },
        ],
        sourceFileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: robotsFilePath,
            kind: "robots",
          },
        ],
      });
    }
  });

  it("prepares file references from disk for metadata-driven engine planning", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-metadata-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const htmlFilePath = "index.html";
    const markdownFilePath = "docs/guide.md";
    const managedMarkdownFilePath = "docs/generated.md";
    const robotsFilePath = "robots.txt";
    await writeOutputFile(
      outputDirectory,
      htmlFilePath,
      '<html><head><title>Home</title><meta name="description" content="Welcome."></head><body><h1>Home</h1></body></html>',
    );
    await writeOutputFile(
      outputDirectory,
      markdownFilePath,
      "# Guide\n\nRead the guide.",
    );
    await writeOutputFile(
      outputDirectory,
      managedMarkdownFilePath,
      '# Generated\n\n<!-- opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:old" manifest="/.well-known/opennav.json" -->\n',
    );
    await writeOutputFile(
      outputDirectory,
      robotsFilePath,
      "User-agent: *\nAllow: /",
    );

    const reader = new FileMetadataReader();
    const result: Result<FileMetadataReadResult, OpenNavError> =
      await reader.read({
        baseUrl: "https://example.com",
        outputDirectory,
        fileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: managedMarkdownFilePath,
            kind: "markdown",
          },
          {
            filePath: markdownFilePath,
            kind: "markdown",
          },
          {
            filePath: robotsFilePath,
            kind: "robots",
          },
        ],
      });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        fingerprintFiles: [
          {
            filePath: htmlFilePath,
            contentFingerprint:
              "sha256:04108e6b69044aed73e60ce6f92a2c176f3bb5b8dba08a40bf9e25d4640e077d",
          },
          {
            filePath: markdownFilePath,
            contentFingerprint:
              "sha256:2291e7d19de35a2aa3583c873631c161d9f0aedf488b3ebb880e23cecca388b5",
          },
          {
            filePath: robotsFilePath,
            contentFingerprint:
              "sha256:44f3f8eafdf064cf69acb05f23ee4dfc9ab5b3d67d81c64246bc29f7e438789a",
          },
        ],
        pageMetadata: [
          {
            sourceFilePath: htmlFilePath,
            sourceContentType: "html",
            route: "/",
            canonicalUrl: "https://example.com/",
            title: "Home",
            description: "Welcome.",
          },
          {
            sourceFilePath: markdownFilePath,
            sourceContentType: "markdown",
            route: "/docs/guide",
            canonicalUrl: "https://example.com/docs/guide",
            title: "Guide",
            description: "Read the guide.",
          },
        ],
        sourceFileReferences: [
          {
            filePath: htmlFilePath,
            kind: "html",
          },
          {
            filePath: markdownFilePath,
            kind: "markdown",
          },
          {
            filePath: robotsFilePath,
            kind: "robots",
          },
        ],
      });
    }
  });
});

async function writeOutputFile(
  outputDirectory: string,
  outputFilePath: string,
  content: string,
): Promise<void> {
  const absoluteFilePath = join(outputDirectory, outputFilePath);

  await mkdir(dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, content, "utf8");
}
