import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import { ResourceLinkBuilder } from "./resource-link-builder";

const BUILD_FINGERPRINT = "sha256:0123456789ab";

function createHtmlPage(
  sourceFilePath: string,
  route: string,
  canonicalUrl: string,
): OpenNavPageMetadata {
  return {
    sourceFilePath,
    sourceContentType: "html",
    route,
    canonicalUrl,
    title: "API",
    description: "Use the API.",
  };
}

function createMarkdownPage(): OpenNavPageMetadata {
  return {
    sourceFilePath: "docs/guide.md",
    sourceContentType: "markdown",
    route: "/docs/guide",
    canonicalUrl: "https://example.com/docs/guide",
    title: "Guide",
    description: "Read the guide.",
  };
}

describe("ResourceLinkBuilder", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact page edits for HTML source files only", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-resource-links-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(join(outputDirectory, "docs"), { recursive: true });
    await writeFile(
      join(outputDirectory, "index.html"),
      "<html><head><title>API</title></head><body><h1>API</h1></body></html>",
      "utf8",
    );
    await writeFile(
      join(outputDirectory, "docs/source.md"),
      "# Source\n",
      "utf8",
    );
    const builder = new ResourceLinkBuilder();

    const result = await builder.build({
      baseUrl: "https://example.com",
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory,
      pages: [
        createHtmlPage("index.html", "/", "https://example.com/"),
        createMarkdownPage(),
      ],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pageEdits: [
          {
            sourceFilePath: "index.html",
            headInsertionOffset: 12,
            links: [
              {
                relation: "alternate",
                mediaType: "text/markdown",
                href: "https://example.com/index.md",
              },
              {
                relation: "index",
                mediaType: "text/plain",
                href: "https://example.com/llms.txt",
                title: "LLMs text site index",
              },
            ],
            headLinkMarkup: `\n  <link rel="alternate" type="text/markdown" href="https://example.com/index.md" data-opennav="resource-link" data-opennav-sha="${BUILD_FINGERPRINT}">\n  <link rel="index" type="text/plain" href="https://example.com/llms.txt" title="LLMs text site index" data-opennav="resource-link" data-opennav-sha="${BUILD_FINGERPRINT}">`,
          },
        ],
        warnings: [],
      });
    }
  });

  it("returns exact warning when HTML head insertion is unavailable", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-resource-links-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    await mkdir(outputDirectory);
    await writeFile(
      join(outputDirectory, "api.html"),
      "<main><h1>API</h1></main>",
      "utf8",
    );
    const builder = new ResourceLinkBuilder();

    const result = await builder.build({
      baseUrl: "https://example.com/docs/",
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory,
      pages: [
        createHtmlPage("api.html", "/api", "https://example.com/docs/api"),
      ],
    });

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        pageEdits: [],
        warnings: [
          {
            code: "RESOURCE_LINK_HTML_HEAD_MISSING",
            message:
              "HTML page does not have a source <head> element for safe resource link insertion.",
            context: {
              sourceFilePath: "api.html",
            },
          },
        ],
      });
    }
  });

  it("returns an exact read error when an HTML source file is missing", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-resource-links-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const sourceFilePath = "missing.html";
    await mkdir(outputDirectory);
    const builder = new ResourceLinkBuilder();

    const result = await builder.build({
      baseUrl: "https://example.com",
      buildFingerprint: BUILD_FINGERPRINT,
      outputDirectory,
      pages: [
        createHtmlPage(
          sourceFilePath,
          "/missing",
          "https://example.com/missing",
        ),
      ],
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
