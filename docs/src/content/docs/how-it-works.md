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
   and safe HTML resource links inside the same output folder.
4. Your existing deploy step publishes the finished folder.

## Files OpenNav Creates

OpenNav writes a predictable set of files inside the configured output folder.

| File | What it does |
| ---- | ------------ |
| `llms.txt` | Root agent-readable site index with links to readable Markdown page endpoints. |
| `.well-known/llms.txt` | Well-known copy of the root site index. |
| `llms-full.txt` | Combined readable page content when the site fits within the configured token limit. |
| `.well-known/llms-full.txt` | Well-known copy of the combined readable content file. |
| `.well-known/opennav.json` | Compatibility manifest with generated artifact paths, resource-link support, Content Signals support, and the build fingerprint. |
| `*.md` page artifacts | Markdown mirrors for HTML pages, such as `docs/api/index.md`. |
| `robots.txt` | Optional Content Signals guidance when `accessGuidance` is configured. |

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

The generated Markdown keeps the readable page content and adds a backlink to
the root site index:

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

## `llms.txt` And `llms-full.txt`

`llms.txt` is the compact entrypoint. It groups known pages by route and links
agents to the generated `.md` endpoints.

`llms-full.txt` is the expanded readable bundle. OpenNav writes it when the
combined page content fits within the configured limit. When it would be too
large, OpenNav skips that file instead of writing a partial or truncated
version.

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
