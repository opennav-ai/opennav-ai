import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result } from "neverthrow";
import { afterEach, describe, expect, it } from "vitest";
import type { OpenNavError } from "../../common/types/opennav-error";
import type { OpenNavPageMetadata } from "../types/opennav-page";
import { HtmlPageReader } from "./html-page-reader";

describe("HtmlPageReader", (): void => {
  let fixtureDirectory: string | undefined;

  afterEach(async (): Promise<void> => {
    if (fixtureDirectory !== undefined) {
      await rm(fixtureDirectory, { force: true, recursive: true });
      fixtureDirectory = undefined;
    }
  });

  it("returns exact metadata-only page data for an HTML file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-html-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "index.html";
    const content = [
      "<!doctype html>",
      "<html>",
      "<head>",
      "<title>Home</title>",
      '<meta name="description" content="Welcome to OpenNav AI.">',
      "</head>",
      "<body><h1>Docs Home</h1></body>",
      "</html>",
    ].join("");
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new HtmlPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com",
        outputDirectory,
        fileReference: {
          filePath,
          kind: "html",
        },
      },
    );

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "html",
        route: "/",
        canonicalUrl: "https://example.com/",
        title: "Home",
        description: "Welcome to OpenNav AI.",
      });
    }
  });

  it("returns exact metadata-only page data for a nested HTML index file", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-html-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "docs/getting-started/index.html";
    const content = [
      "<html>",
      "<head>",
      "<title>Getting Started</title>",
      '<meta content="Install the package." name="description">',
      "</head>",
      "<body></body>",
      "</html>",
    ].join("");
    await mkdir(join(outputDirectory, "docs/getting-started"), {
      recursive: true,
    });
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new HtmlPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com",
        outputDirectory,
        fileReference: {
          filePath,
          kind: "html",
        },
      },
    );

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "html",
        route: "/docs/getting-started/",
        canonicalUrl: "https://example.com/docs/getting-started/",
        title: "Getting Started",
        description: "Install the package.",
      });
    }
  });

  it("uses the HTML title before the first h1 when both exist", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-html-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "reference.html";
    const content = [
      "<html>",
      "<head><title>API Reference</title></head>",
      "<body><h1>Reference Heading</h1></body>",
      "</html>",
    ].join("");
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new HtmlPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com",
        outputDirectory,
        fileReference: {
          filePath,
          kind: "html",
        },
      },
    );

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "html",
        route: "/reference",
        canonicalUrl: "https://example.com/reference",
        title: "API Reference",
        description: undefined,
      });
    }
  });

  it("uses the first h1 as the title when the HTML title is missing", async (): Promise<void> => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "opennav-html-page-"));
    const outputDirectory = join(fixtureDirectory, "dist");
    const filePath = "reference.html";
    const content = "<html><body><h1>Reference Heading</h1></body></html>";
    await mkdir(outputDirectory);
    await writeFile(join(outputDirectory, filePath), content, "utf8");

    const reader = new HtmlPageReader();
    const result: Result<OpenNavPageMetadata, OpenNavError> = await reader.read(
      {
        baseUrl: "https://example.com",
        outputDirectory,
        fileReference: {
          filePath,
          kind: "html",
        },
      },
    );

    expect(result.isOk()).toEqual(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceFilePath: filePath,
        sourceContentType: "html",
        route: "/reference",
        canonicalUrl: "https://example.com/reference",
        title: "Reference Heading",
        description: undefined,
      });
    }
  });
});
