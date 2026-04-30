# Astro 6 Static Quick Start

Use this pattern when your Astro 6 site builds static HTML and you want OpenNav
to run automatically after `astro build`.

## Install

```sh
npm install @opennav-ai/opennav
```

## Configure Astro

Add `OpenNavAstro` to `astro.config.mjs`:

```js
import { OpenNavAstro } from "@opennav-ai/opennav/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://example.com",
  output: "static",
  integrations: [
    OpenNavAstro({
      siteName: "Example Docs",
      mode: "static",
    }),
  ],
});
```

Then run:

```sh
npm run build
```

## What This Example Does

This example uses `astro@6.1.10`.

- [`astro.config.mjs`](./astro.config.mjs) wires `OpenNavAstro`.
- [`src/pages/index.astro`](./src/pages/index.astro) creates the home page.
- [`src/pages/docs.astro`](./src/pages/docs.astro) creates a second route.
- [`src/pages/guides/setup.astro`](./src/pages/guides/setup.astro) creates a
  nested route.

## Common Setup Notes

Set `output: "static"` so Astro writes static files.

Set Astro's top-level `site` to your public deployed URL, or pass `siteUrl`
inside `OpenNavAstro`.

Use `mode: "static"` or omit it. Static mode is the default.

## More Options

See the root [options and file outcomes reference](../../README.md#entrypoints-and-options-reference)
for all `OpenNavAstro` fields, generated files, and `robots.txt`
access-guidance behavior.
