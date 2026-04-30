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
| `llms-full.txt` | Combined readable page content when the site fits within the configured token limit. |
| `.well-known/llms-full.txt` | Well-known copy of the full readable content file. |
| `.well-known/opennav.json` | Static compatibility manifest with artifact paths and build fingerprint. |
| `*.md` page artifacts | Markdown mirrors for HTML pages, such as `docs/api/index.md`. |
| `*.html` pages | Safe `<head>` links pointing to Markdown mirrors and `llms.txt`. |
| `robots.txt` | Optional Content Signals guidance when configured by the caller. |

OpenNav skips unsupported files such as JavaScript, CSS, source maps, images,
fonts, media, archives, framework payload files, platform routing files, and
static HTTP error pages like `404.html` and `500.html`.

## Result Fields

| Result field | Meaning |
| ------------ | ------- |
| `createdFilePaths` | Output-directory-relative paths OpenNav created, or would create during `--dry-run`. |
| `modifiedFilePaths` | Existing output-directory-relative paths OpenNav edited, or would edit during `--dry-run`. |
| `skippedFilePaths` | Paths OpenNav saw but intentionally ignored, such as assets or unsupported files. |
| `warnings` | Non-fatal typed issues, such as unsupported files or recoverable guidance conflicts. |
