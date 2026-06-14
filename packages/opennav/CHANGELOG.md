# Changelog

All notable changes to `@opennav-ai/opennav` are documented in this file.

## [0.2.0] - 2026-06-14

### Added

- **`OpenNavServer`** — runtime content negotiation for server-rendered pages.
  When a client sends `Accept: text/markdown`, the server converts the HTML
  response to clean Markdown on-the-fly. Works with any WinterCG-compatible
  runtime (Hono, Astro SSR, Next.js, Cloudflare Workers, Bun, SvelteKit).

  ```ts
  import { OpenNavServer } from "@opennav-ai/opennav/server";
  const opennav = new OpenNavServer();
  const result = await opennav.negotiate({ request, htmlResponse });
  ```

- **`OpenNavServer.accept(request)`** — parses the request Accept header and
  returns the content type decision synchronously with no I/O. Callers use this
  to branch before fetching or rendering expensive page content — for example,
  to serve a pre-built static `.md` file directly without invoking the HTML
  render.

- **`OpenNavServer.toMarkdown({ request, htmlResponse })`** — converts an HTML
  response body to Markdown without inspecting the Accept header. Callers use
  this when the decision is already settled (static `.md` cache miss,
  Markdown-only API endpoints).

- **`AcceptHeaderNegotiator`** — RFC 9110 content negotiation engine that
  parses Accept headers and picks the best matching content type from a
  configured `produces` list. Exported from `@opennav-ai/opennav/server` for
  callers that need standalone negotiation.

- **`HtmlResponseMarkdownNegotiator`** — converts HTML responses to Markdown
  using turndown, with optional layout stripping and link rewriting.

- **Layout stripping** — `OpenNavServer` accepts `contentExtraction: {
  stripLayout: true }` to remove nav, header, footer, and other chrome elements
  before Markdown conversion. Also available in the static build via the same
  option.

- **`Vary: Accept` header** — all negotiated responses include `Vary: Accept`
  so caches keep HTML and Markdown representations separate.

- **`Link: rel="alternate"` header** — HTML responses include a Link header
  advertising the Markdown alternate representation so agents and browsers can
  discover it.

- **Cloudflare Pages Functions documentation** — guides for Cloudflare Pages
  Functions and Workers showing static `.md` priority with runtime fallback,
  and how to avoid wasted CPU with `opennav.accept()`.

## [0.1.2] - 2026-06-07

### Changed

- **Documentation site** — updated to use the published `@opennav-ai/opennav`
  package from npm instead of workspace references. Added GitHub repository
  links to the docs site header and navigation.

## [0.1.1] - 2026-06-06

### Added

- **Package license** — added the `LICENSE` file to the published npm package
  so license information appears on npmjs.com.

## [0.1.0] - 2026-06-06

### Added

- **Initial public release** — `@opennav-ai/opennav` published to the npm
  registry.

- **`OpenNavStaticSite`** — run the OpenNav engine against a built static
  output directory to generate agent-readable files (`index.md`, `llms.txt`,
  `llms-full.txt`, `.well-known/opennav.json`, `robots.txt`).

- **`opennav build` CLI** — command-line entry point for static site
  generation with `--output`, `--site-url`, `--site-name`, `--platform`,
  `--dry-run`, and `--full-run` flags.

- **`OpenNavAstro`** — Astro integration that runs OpenNav after `astro build`.
  Supports `mode: "static"` and `platform: "cloudflare-pages"`.

- **`OpenNavNext`** — Next.js config wrapper for static export builds.
  Supports `output: "export"` and `platform: "cloudflare-pages"`.

- **Cloudflare Pages `_headers` generation** — when `platform:
  "cloudflare-pages"` is configured, OpenNav creates or updates a
  `_headers` file with proper content types for `.md`, `llms.txt`,
  `llms-full.txt`, and `opennav.json` artifacts.

- **Build fingerprinting** — every generated file is stamped with a stable
  SHA-256 fingerprint so agents and caching layers can detect changes.

- **`OpenNavConfig`** — a typed config helper for SDK consumers that validates
  options at construction time.

[0.2.0]: https://github.com/opennav-ai/opennav-ai/compare/opennav-v0.1.2...opennav-v0.2.0
[0.1.2]: https://github.com/opennav-ai/opennav-ai/compare/opennav-v0.1.1...opennav-v0.1.2
[0.1.1]: https://github.com/opennav-ai/opennav-ai/compare/opennav-v0.1.0...opennav-v0.1.1
[0.1.0]: https://github.com/opennav-ai/opennav-ai/releases/tag/opennav-v0.1.0
