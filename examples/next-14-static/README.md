# Next 14 Static Quick Start

Use this pattern when your Next 14 app uses static export and you want OpenNav
to run automatically after `next build`.

## Install

```sh
npm install @opennav-ai/opennav
```

## Configure Next

Wrap your Next config with `OpenNavNext`:

```js
import { OpenNavNext } from "@opennav-ai/opennav/next";

const nextConfig = {
  output: "export",
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

This example uses `next@14.2.35`.

- [`next.config.mjs`](./next.config.mjs) wraps the config with `OpenNavNext`.
- [`app/page.js`](./app/page.js) creates the home page.
- [`app/docs/page.js`](./app/docs/page.js) creates a second route.
- [`app/guides/setup/page.js`](./app/guides/setup/page.js) creates a nested
  route.

## Common Setup Notes

Set `output: "export"` so Next writes static files to `out/`.

Set `siteUrl` to your public deployed URL, not a local path.

Use `mode: "static"` or omit it. Static mode is the default.

## More Options

See the root [options and file outcomes reference](../../README.md#entrypoints-and-options-reference)
for all `OpenNavNext` fields, generated files, and `robots.txt`
access-guidance behavior.
