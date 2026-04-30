# CLI Build-Script Quick Start

Use this pattern when your project already has a command that writes static
HTML files, and you want OpenNav to run after that command.

## Install

```sh
npm install --save-dev @opennav-ai/opennav
```

## Add The Build Script

Run OpenNav after your existing static build command:

```json
{
  "scripts": {
    "build": "your-static-site-build && opennav build --static --output dist --site-url https://example.com --site-name \"Example Docs\""
  }
}
```

Replace:

- `your-static-site-build` with the command that writes your site files.
- `dist` with your output folder, such as `dist`, `out`, or `build`.
- `https://example.com` with your public deployed site URL.
- `Example Docs` with your public site or docs name.

Then run:

```sh
npm run build
```

## Preview Without Writing

Add `--dry-run` to preview the OpenNav plan:

```sh
opennav build --static --output dist --site-url https://example.com --site-name "Example Docs" --dry-run
```

For package scripts, keep the static build first:

```json
{
  "scripts": {
    "opennav:dry-run": "your-static-site-build && opennav build --static --output dist --site-url https://example.com --site-name \"Example Docs\" --dry-run"
  }
}
```

## What This Example Does

This example uses a tiny local static build command so the workflow is runnable
without a framework:

```json
{
  "scripts": {
    "build": "npm run build:static && opennav build --static --output dist --site-url https://cli.example.com --site-name \"CLI Example Docs\"",
    "build:static": "node --experimental-strip-types scripts/build-static-output.ts"
  }
}
```

`build:static` creates a small `dist/` folder. The `build` script then runs the
CLI against that folder.

## More Options

See the root [options and file outcomes reference](../../README.md#entrypoints-and-options-reference)
for every CLI flag, generated file, and `robots.txt` access-guidance behavior.
