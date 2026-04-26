import { describe, expect, it } from "vitest";
import type { PageUrlBuildResult } from "../types/page-url-build-result";
import { PageUrlBuilder } from "./page-url-builder";

describe("PageUrlBuilder", (): void => {
  it("builds exact route and canonical URL for the site root page", (): void => {
    const builder = new PageUrlBuilder();

    const result: PageUrlBuildResult = builder.build({
      baseUrl: "https://example.com",
      filePath: "index.html",
    });

    expect(result).toEqual({
      route: "/",
      canonicalUrl: "https://example.com/",
    });
  });

  it("builds exact route and canonical URL for a nested index page", (): void => {
    const builder = new PageUrlBuilder();

    const result: PageUrlBuildResult = builder.build({
      baseUrl: "https://example.com",
      filePath: "docs/getting-started/index.html",
    });

    expect(result).toEqual({
      route: "/docs/getting-started/",
      canonicalUrl: "https://example.com/docs/getting-started/",
    });
  });

  it("builds exact route and canonical URL for a Markdown page", (): void => {
    const builder = new PageUrlBuilder();

    const result: PageUrlBuildResult = builder.build({
      baseUrl: "https://example.com/docs/",
      filePath: "api/reference.md",
    });

    expect(result).toEqual({
      route: "/api/reference",
      canonicalUrl: "https://example.com/docs/api/reference",
    });
  });
});
