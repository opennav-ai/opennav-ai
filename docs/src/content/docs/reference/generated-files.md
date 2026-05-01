---
title: Generated Files
description: Files and edits OpenNav creates inside a static output folder.
---

OpenNav creates or updates only files inside the configured static output
folder.

| File | Purpose |
| ---- | ------- |
| `llms.txt` | Root agent-readable site index. |
| `.well-known/llms.txt` | Well-known copy of the site index. |
| `llms-full.txt` | Combined readable page content, capped at complete page blocks when the configured token limit is reached. |
| `.well-known/llms-full.txt` | Well-known copy of the full readable content file. |
| `.well-known/opennav.json` | Static compatibility manifest with artifact paths and build fingerprint. |
| `*.md` page artifacts | Markdown mirrors for HTML pages, such as `docs/api/index.md`. By default these are converted from the whole HTML `<body>`; `contentExtraction.stripLayout` can remove documented layout elements first. |
| `*.html` pages | Safe `<head>` links pointing to Markdown mirrors and `llms.txt`. |
| `robots.txt` | Optional Content Signals guidance when configured by the caller. |
| `_headers` | Optional platform response-header artifact. Created by default for Cloudflare Pages when `platform: "cloudflare-pages"` or `--platform cloudflare-pages` is configured. It sets content types for generated artifacts and per-page `Link` headers for HTML routes. |

OpenNav skips unsupported files such as JavaScript, CSS, source maps, images,
fonts, media, archives, framework payload files, platform routing files, and
static HTTP error pages like `404.html` and `500.html`.

## Build Result

OpenNav returns output-directory-relative paths for files it created, modified,
or intentionally skipped.

```typescript
type OpenNavOutputFilePath = string;

interface OpenNavError {
  readonly code: string;
  readonly message: string;
  readonly context: Readonly<Record<string, unknown>>;
}

interface OpenNavBuildResult {
  readonly createdFilePaths: readonly OpenNavOutputFilePath[];
  readonly modifiedFilePaths: readonly OpenNavOutputFilePath[];
  readonly skippedFilePaths: readonly OpenNavOutputFilePath[];
  readonly warnings: readonly OpenNavError[];
}
```

During `--dry-run`, `createdFilePaths` and `modifiedFilePaths` report files
OpenNav would create or update without changing the output folder.
