---
title: Changelog
description: Release notes for @opennav-ai/opennav — new features, fixes, and behaviour changes.
---

Every release of `@opennav-ai/opennav` is documented here. These notes describe
customer-facing behaviour: new APIs, changed defaults, platform support,
and breaking changes. The full changelog is also available in the
[GitHub repository](https://github.com/opennav-ai/opennav-ai/blob/main/packages/opennav/CHANGELOG.md).

## 0.2.0 — 2026-06-14

### Server-side content negotiation

`OpenNavServer` gives every server-rendered page a Markdown representation
through standard HTTP `Accept` header negotiation. Three new methods on
`OpenNavServer` let you pick the right level of control:

| Method | When to use |
| ------ | ----------- |
| `negotiate({ request, htmlResponse })` | Full pipeline — accept header → decision → response. The default for most routes. |
| `accept(request)` | Need the Accept decision *before* fetching or rendering expensive page content. Sync, no I/O. |
| `toMarkdown({ request, htmlResponse })` | Already know Markdown is needed (static `.md` cache miss, markdown-only endpoint). |

Read the [server-side guide](/frameworks/server-side/) for framework-specific
examples for Hono, Astro SSR, Next.js, and Cloudflare Workers.

### Other additions

- **Accept header negotiation** — RFC 9110-compliant Accept header parsing with
  q-value weighting, wildcard matching, and client-order tiebreaking.
- **Layout stripping** — remove nav, header, footer, and chrome elements before
  Markdown conversion with `contentExtraction: { stripLayout: true }`.
- **`Vary: Accept`** on all negotiated responses so caches keep HTML and
  Markdown representations separate.
- **`Link: rel="alternate"`** on HTML responses advertising the Markdown
  representation so agents can discover it.
- **Cloudflare Pages Functions guide** — static `.md` priority with runtime
  fallback using `opennav.accept()` to avoid wasted CPU.

## 0.1.2 — 2026-06-07

- Documentation site updated to use the published `@opennav-ai/opennav` package
  from npm instead of workspace references.
- GitHub repository links added to the docs site header and navigation.

## 0.1.1 — 2026-06-06

- `LICENSE` file added to the published npm package so license information
  appears on npmjs.com.

## 0.1.0 — 2026-06-06

Initial public release of `@opennav-ai/opennav`.

- **`OpenNavStaticSite`** — generate agent-readable files (`index.md`,
  `llms.txt`, `llms-full.txt`, `.well-known/opennav.json`, `robots.txt`)
  from a static output directory.
- **`opennav build` CLI** — command-line entry point with `--output`,
  `--site-url`, `--site-name`, `--platform`, `--dry-run`, and
  `--full-run` flags.
- **`OpenNavAstro`** — Astro integration that runs after `astro build`.
- **`OpenNavNext`** — Next.js config wrapper for static export builds.
- **Cloudflare Pages `_headers`** — proper content types for `.md`,
  `llms.txt`, and `opennav.json` artifacts.
- **Build fingerprinting** — every generated file is stamped with a stable
  SHA-256 fingerprint so agents and caching layers can detect changes.
