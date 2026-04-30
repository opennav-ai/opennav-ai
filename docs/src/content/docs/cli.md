---
title: CLI
description: Use the opennav command with a finished static output folder.
---

The CLI entrypoint is for projects that already have a shell build command and
want the smallest OpenNav setup.

```bash
opennav build --static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs"
```

Add `--dry-run` to preview without writing files.

## Options

| CLI option | Required | What it means | File outcome |
| ---------- | -------- | ------------- | ------------ |
| `build` | Yes | Runs the build command. | Starts the static OpenNav workflow. |
| `--static` | Yes | Treats `--output` as a finished static-site folder. | OpenNav scans existing HTML, Markdown, and `robots.txt` files in the folder. |
| `--output <directory>` | Yes | Built output folder, such as `dist`, `out`, or `build`. | All created and modified files stay inside this folder. |
| `--site-url <url>` | Yes | Public deployed site URL, including protocol and host. | Generated artifacts use this URL. |
| `--site-name <name>` | Yes | Human-readable site or docs name. | Appears in generated `llms` files and metadata. |
| `--preset <preset>` | No | Framework hint. Supported values are `astro` and `next-export`. | Passes the preset to the static SDK. |
| `--dry-run` | No | Preview mode. | Reports planned created, modified, skipped, and warning paths without changing files. |

The CLI writes files by default. There is no `--full-run` flag for the current
static workflow.
