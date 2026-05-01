---
title: How It Works
description: What OpenNav creates, changes, skips, and leaves alone.
---

OpenNav runs after your normal static site build. It reads the finished output
folder, creates agent-readable files beside the generated HTML, and leaves the
folder ready to deploy to the same host or CDN you already use.

It does not call an LLM, crawl the public internet, edit your source files, or
send your site content to an external service.

## Build Flow

1. You build your site into a folder such as `dist`, `out`, or `build`.
2. OpenNav scans that folder for HTML pages, Markdown pages, and `robots.txt`.
3. OpenNav creates Markdown mirrors, `llms` indexes, compatibility metadata,
   safe HTML resource links, optional Content Signals guidance, and optional
   platform header files inside the same output folder.
4. Your existing deploy step publishes the finished folder.

When you run with `--dry-run` or SDK `dryRun: true`, OpenNav returns the same
planned created, modified, skipped, and warning paths without writing the
output folder.

## Files And Edits OpenNav Plans

OpenNav writes a predictable set of files and page edits inside the configured
output folder.

| File or edit | What it does |
| ------------ | ------------ |
| `llms.txt` | Root agent-readable site index with links to readable Markdown page endpoints. |
| `.well-known/llms.txt` | Well-known copy of the root site index. |
| `llms-full.txt` | Combined readable page content, capped at complete page blocks when the configured token limit is reached. |
| `.well-known/llms-full.txt` | Well-known copy of the combined readable content file. |
| `.well-known/opennav.json` | Compatibility manifest with generated artifact paths, resource-link support, Content Signals support, and the build fingerprint. |
| `*.md` page artifacts | Markdown mirrors for HTML pages, such as `docs/api/index.md`. |
| `*.html` page edits | Safe `<head>` resource links pointing to each page's Markdown mirror and the root `llms.txt`. |
| `robots.txt` | Optional Content Signals guidance when `accessGuidance` is configured. |
| `_headers` | Optional platform response-header artifact. Cloudflare Pages creates this by default when `platform: "cloudflare-pages"` or `--platform cloudflare-pages` is configured. |

Generated files include an OpenNav build marker so later runs can safely update
the files OpenNav owns without claiming unrelated user files.

## Page Markdown

For every supported HTML page, OpenNav creates a matching `.md` endpoint. The
path mirrors the page route:

```txt
index.html                -> index.md
docs/index.html           -> docs/index.md
docs/api.html             -> docs/api.md
docs/reference/index.html -> docs/reference/index.md
```

By default, OpenNav converts the whole HTML `<body>` to Markdown. That keeps the
static behavior conservative for sites with custom HTML structures. Callers can
enable `contentExtraction.stripLayout` to remove the documented layout elements
before Markdown conversion.

This first version uses a fixed strip list. Future versions are expected to add
more granular HTML element controls, such as tag-level, class-level, or
selector-level strip and preserve rules.

The generated Markdown also adds a backlink to the root site index:

```markdown
---

Site index: [llms.txt](https://example.com/llms.txt)
```

When a generated Markdown page links to another known page on the same site,
OpenNav rewrites that link to the other page's `.md` endpoint. For example, a
link from `/docs/guide/` to `/docs/api/` becomes a link to
`https://example.com/docs/api.md` when OpenNav has a matching Markdown artifact
for that page.

External links and links to unknown pages are left alone.

See the [content extraction reference](/reference/content-extraction/) for the
exact `stripLayout` behavior.

## HTML Resource Links

OpenNav also updates supported HTML pages with safe `<head>` resource links.
These links let agents discover the Markdown mirror and root `llms.txt` from
the HTML page they already reached:

```html
<link rel="alternate" type="text/markdown" href="https://example.com/index.md">
<link rel="index" type="text/plain" href="https://example.com/llms.txt">
```

OpenNav marks the links it manages so future runs can replace stale OpenNav
links without disturbing other `<head>` content.

## Platform Headers

OpenNav can also write platform-specific static header files when the caller
configures a supported platform. Today the supported platform is
[Cloudflare Pages](/platforms/cloudflare/).

For Cloudflare Pages, `platform: "cloudflare-pages"` or
`--platform cloudflare-pages` creates or updates `_headers` by default. The
managed block sets concrete content types for generated artifacts:

```txt
/*.md
  Content-Type: text/markdown; charset=utf-8

/llms.txt
  Content-Type: text/plain; charset=utf-8

/.well-known/opennav.json
  Content-Type: application/json; charset=utf-8
```

The same `_headers` block also adds HTTP `Link` headers for each HTML route.
Those headers point agents at the generated Markdown mirror for that page and
the root `llms.txt` index:

```txt
/docs/page
  Link: <https://example.com/docs/page.md>; rel="alternate"; type="text/markdown"
  Link: <https://example.com/llms.txt>; rel="index"; type="text/plain"
```

OpenNav only owns the block between `# Begin OpenNav AI` and `# End OpenNav AI`.
Existing Cloudflare `_headers` rules outside that block are preserved. If an
existing route rule overlaps with an OpenNav route, OpenNav reports a warning
instead of rewriting `_headers`.

## `llms.txt` And `llms-full.txt`

`llms.txt` is the compact entrypoint. It groups known pages by route and links
agents to the generated `.md` endpoints.

`llms-full.txt` is the expanded readable bundle. OpenNav adds pages as complete
blocks while the file stays within the configured token limit. When adding the
next page would exceed that limit, OpenNav stops before that page and returns a
`LLMS_FULL_TXT_TOKEN_LIMIT_REACHED` warning with the omitted page paths. It does
not truncate a page body mid-block.

## `opennav.json`

OpenNav publishes `.well-known/opennav.json` so tools can verify what this build
supports without guessing from filenames.

The manifest records the static compatibility profile, generated artifact
paths, resource-link support, Content Signals support, and a build fingerprint.
Today that helps OpenNav safely update its own files across builds. Over time,
the manifest is intended to support broader OpenNav compatibility checks as the
static profile becomes part of a wider agent-navigation standard.

## `robots.txt`

OpenNav only creates or edits `robots.txt` for Content Signals when
`accessGuidance` is configured.

When enabled, OpenNav writes a managed block between `# Begin OpenNav AI` and
`# End OpenNav AI`. Existing unmanaged `robots.txt` rules are preserved. If
OpenNav sees unmanaged Content Signals it cannot safely reconcile, it reports a
warning instead of rewriting that file.

## Files OpenNav Skips

OpenNav skips files that are not useful as readable page content or that should
not be treated as page routes.

Skipped files include JavaScript, CSS, source maps, images, fonts, media,
archives, framework payload files, platform routing files, and static HTTP
error pages such as `404.html` and `500.html`.

Skipped paths are reported in `skippedFilePaths`, with warnings when the skip is
important for a user to see.

## What OpenNav Does Not Do

OpenNav does not edit your source project. It only reads and writes the
configured static output folder.

OpenNav does not publish or deploy the site. Your existing hosting workflow
still deploys the finished folder.

OpenNav does not enforce crawler behavior. Content Signals express preferences
in `robots.txt`; use crawler controls, WAF rules, bot management,
authentication, or paywalling when you need enforcement.
