---
title: Content Extraction
description: Configure optional layout stripping before HTML pages become Markdown.
---

`contentExtraction` controls how OpenNav reads built HTML pages before creating
generated Markdown page artifacts and `llms-full.txt`.

OpenNav is conservative by default. If you omit `contentExtraction`, or set
`stripLayout` to `false`, OpenNav converts the whole HTML `<body>` to Markdown.
That preserves unusual page structures and avoids dropping content from sites
that use layout tags in custom ways.

Use `stripLayout` only when your built HTML uses normal layout elements for
repeated page interface such as navigation, sidebars, search, headers, footers,
or table-of-contents panels.

```typescript
interface OpenNavContentExtractionOptions {
  readonly stripLayout?: boolean;
}
```

## `stripLayout`

Optional. Defaults to `false`.

When `stripLayout` is `true`, OpenNav still starts from the whole HTML `<body>`.
It does not choose a `<main>`, `<article>`, or custom content root. Before
converting that body to Markdown, it removes only the fixed layout elements
listed below.

OpenNav strips these elements when `stripLayout` is enabled:

| Element or selector | Why it is removed |
| ------------------- | ----------------- |
| `<nav>` | Site navigation, side navigation, and table-of-contents navigation. |
| `<aside>` | Sidebars, complementary panels, and generated table-of-contents blocks. |
| `<header>` | Repeated page or site headers. |
| `<footer>` | Repeated page or site footers, including previous/next page navigation. |
| `<search>` | HTML search widgets. |
| `<site-search>` | Starlight-style custom search widgets. |
| `[role="navigation"]` | ARIA navigation landmarks not expressed with `<nav>`. |
| `[role="search"]` | Search widgets not expressed with `<search>`. |
| `[role="complementary"]` | Sidebar-like complementary landmarks. |
| `[data-pagefind-ignore]` | Content already marked to be ignored by page indexing. |
| Skip links | Links whose `href` starts with `#` and whose visible text starts with `skip to`. |

OpenNav always excludes technical non-readable elements such as `<head>`,
`<meta>`, `<script>`, `<style>`, and `<title>` from generated Markdown. That
behavior does not require `stripLayout`.

## When To Leave It Off

Leave `stripLayout` unset or `false` when your pages use `<header>`, `<footer>`,
`<aside>`, or navigation landmarks for core article content, examples, legal
copy, API reference content, or other text agents should read.

The first version intentionally does not accept custom selector arrays. Future
releases are expected to add more granular controls, such as tag-level,
class-level, or selector-level strip and preserve rules, without changing the
top-level `contentExtraction` object.

## Examples

SDK, Astro, and Next use the same option shape:

```typescript
contentExtraction: {
  stripLayout: true,
}
```

The CLI flag maps to the same setting:

```bash
opennav build --static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs" \
  --strip-layout
```
