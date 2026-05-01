import { describe, expect, it } from "vitest";
import type { OpenNavPageMetadata } from "../../pages/types/opennav-page";
import { CloudflarePagesHeadersBuilder } from "./cloudflare-pages-headers-builder";

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
const MANAGED_BLOCK_WITH_PAGE_LINKS = `# Begin OpenNav AI
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

/
  Link: <https://example.com/index.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"

/docs/about
  Link: <https://example.com/docs/about.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"

/guides/
  Link: <https://example.com/guides/index.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"
# End OpenNav AI
`;

const PAGES: readonly OpenNavPageMetadata[] = [
  {
    sourceFilePath: "index.html",
    sourceContentType: "html",
    route: "/",
    canonicalUrl: "https://example.com/",
    title: "Home",
    description: "Start here.",
  },
  {
    sourceFilePath: "docs/about.html",
    sourceContentType: "html",
    route: "/docs/about",
    canonicalUrl: "https://example.com/docs/about",
    title: "About",
    description: "Learn about OpenNav.",
  },
  {
    sourceFilePath: "guides/index.html",
    sourceContentType: "html",
    route: "/guides/",
    canonicalUrl: "https://example.com/guides/",
    title: "Guides",
    description: "Read the guides.",
  },
  {
    sourceFilePath: "reference.md",
    sourceContentType: "markdown",
    route: "/reference",
    canonicalUrl: "https://example.com/reference",
    title: "Reference",
    description: "API reference.",
  },
];

describe("CloudflarePagesHeadersBuilder", (): void => {
  it("creates an OpenNav-managed Cloudflare Pages headers file", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "_headers",
          content: MANAGED_BLOCK,
        },
      ],
      warnings: [],
    });
  });

  it("creates per-page Link headers for HTML Markdown alternates and the site index", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      baseUrl: "https://example.com",
      pages: PAGES,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "_headers",
          content: MANAGED_BLOCK_WITH_PAGE_LINKS,
        },
      ],
      warnings: [],
    });
  });

  it("appends a managed block while preserving caller-owned header rules", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: "/assets/*\n  Cache-Control: public, max-age=31536000\n",
    });

    expect(result).toEqual({
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
  });

  it("replaces an existing managed block and preserves surrounding rules", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: `/assets/*
  Cache-Control: public, max-age=31536000

# Begin OpenNav AI
# opennav compatible="true" version="1.0" profile="static-agent-ready" build-fingerprint="sha256:old" manifest="/.well-known/opennav.json"
/*.md
  Content-Type: text/plain
# End OpenNav AI

/feed.xml
  X-Robots-Tag: noindex
`,
    });

    expect(result).toEqual({
      files: [
        {
          outputFilePath: "_headers",
          content: `/assets/*
  Cache-Control: public, max-age=31536000

${MANAGED_BLOCK}
/feed.xml
  X-Robots-Tag: noindex
`,
        },
      ],
      warnings: [],
    });
  });

  it("skips invalid managed blocks instead of rewriting caller content", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: `# Begin OpenNav AI
/*.md
  Content-Type: text/markdown; charset=utf-8
`,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "STATIC_HEADERS_OPENNAV_MANAGED_BLOCK_INVALID",
          message:
            "Existing _headers contains an invalid OpenNav managed block.",
          context: {
            filePath: "_headers",
            beginMarkerCount: 1,
            endMarkerCount: 0,
          },
        },
      ],
    });
  });

  it("skips caller-owned Markdown routes that overlap with OpenNav paths", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: `/*.md
  Content-Type: text/plain; charset=utf-8
`,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "STATIC_HEADERS_ROUTE_CONFLICT",
          message:
            "Existing _headers route rules overlap with OpenNav static headers.",
          context: {
            filePath: "_headers",
            conflictingRules: ["/*.md"],
          },
        },
      ],
    });
  });

  it("skips caller-owned exact routes that overlap with OpenNav paths", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: `/llms.txt
  Cache-Control: no-store

/llms-full.txt
  Cache-Control: no-store

/.well-known/llms.txt
  Cache-Control: no-store

/.well-known/llms-full.txt
  Cache-Control: no-store

/.well-known/opennav.json
  Cache-Control: no-store
`,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "STATIC_HEADERS_ROUTE_CONFLICT",
          message:
            "Existing _headers route rules overlap with OpenNav static headers.",
          context: {
            filePath: "_headers",
            conflictingRules: [
              "/llms.txt",
              "/llms-full.txt",
              "/.well-known/llms.txt",
              "/.well-known/llms-full.txt",
              "/.well-known/opennav.json",
            ],
          },
        },
      ],
    });
  });

  it("skips caller-owned wildcard routes that overlap with OpenNav paths", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      existingContent: `/*
  X-Robots-Tag: noindex
`,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "STATIC_HEADERS_ROUTE_CONFLICT",
          message:
            "Existing _headers route rules overlap with OpenNav static headers.",
          context: {
            filePath: "_headers",
            conflictingRules: ["/*"],
          },
        },
      ],
    });
  });

  it("skips caller-owned page routes that overlap with OpenNav Link headers", (): void => {
    const result = new CloudflarePagesHeadersBuilder().build({
      buildFingerprint: BUILD_FINGERPRINT,
      baseUrl: "https://example.com",
      pages: PAGES,
      existingContent: `/docs/about
  Cache-Control: no-store
`,
    });

    expect(result).toEqual({
      files: [],
      warnings: [
        {
          code: "STATIC_HEADERS_ROUTE_CONFLICT",
          message:
            "Existing _headers route rules overlap with OpenNav static headers.",
          context: {
            filePath: "_headers",
            conflictingRules: ["/docs/about"],
          },
        },
      ],
    });
  });
});
