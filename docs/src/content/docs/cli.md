---
title: CLI
description: Use the opennav command with a finished static output folder.
---

The CLI entrypoint is for projects that already have a shell build command and
want the smallest OpenNav setup.

## Install

Install OpenNav in the project that owns the static build command.

```bash
npm install @opennav-ai/opennav
```

```bash
opennav build --static \
  --output dist \
  --site-url https://example.com \
  --site-name "Example Docs"
```

Add `--dry-run` to preview without writing files.

## `opennav build --static`

Runs OpenNav against an existing static output folder.

```bash
opennav build --static \
  --output <directory> \
  --site-url <url> \
  --site-name <name> \
  [--preset <preset>] \
  [--dry-run]
```

### `--static`

Required. Treats `--output` as a finished static-site folder. OpenNav scans
existing HTML, Markdown, and `robots.txt` files in that folder.

### `--output <directory>`

Required. Built output folder, such as `dist`, `out`, or `build`.

All created and modified files stay inside this folder.

### `--site-url <url>`

Required. Public deployed site URL used for generated links and manifest URLs.
The value should include the protocol and host, such as `https://example.com`.

### `--site-name <name>`

Required. Human-readable site or docs name written into generated `llms` files
and metadata.

### `--preset <preset>`

Optional. Framework hint for static-folder conventions.

Supported values are `astro` and `next-export`.

### `--dry-run`

Optional. Reports planned created, modified, skipped, and warning paths without
changing files.

The CLI writes files by default. There is no `--full-run` flag for the current
static workflow.
