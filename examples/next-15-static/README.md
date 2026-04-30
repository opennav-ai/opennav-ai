# Next 15 Static Quick Start

Use this pattern when your Next 15 app uses static export and you want OpenNav
to run automatically after `next build`.

## Install

```sh
npm install @opennav-ai/opennav
```

## Configure Next

Wrap your Next config with `OpenNavNext`:

```js
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenNavNext } from "@opennav-ai/opennav/next";

const projectDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "export",
  outputFileTracingRoot: projectDirectory,
};

export default OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
})(nextConfig);
```

Then run:

```sh
npm run build
```

## What This Example Does

This example uses `next@15.5.15`.

- [`next.config.mjs`](./next.config.mjs) wraps the config with `OpenNavNext`.
- [`app/page.js`](./app/page.js) creates the home page.
- [`app/docs/page.js`](./app/docs/page.js) creates a second route.
- [`app/guides/setup/page.js`](./app/guides/setup/page.js) creates a nested
  route.

## Common Setup Notes

Set `output: "export"` so Next writes static files to `out/`.

This example sets `outputFileTracingRoot` so the fixture stays isolated inside
the repository. Your app may not need that option unless Next asks for it.

Set `siteUrl` to your public deployed URL, not a local path.

Use `mode: "static"` or omit it. Static mode is the default.

## More Options

See the root [options and file outcomes reference](../../README.md#entrypoints-and-options-reference)
for all `OpenNavNext` fields, generated files, and `robots.txt`
access-guidance behavior.
