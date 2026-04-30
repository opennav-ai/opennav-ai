# Static-Site SDK Quick Start

Use this pattern when you want to call OpenNav from your own Node script instead
of using the CLI or a framework integration.

## Install

```sh
npm install @opennav-ai/opennav
```

## Create A Build Script

Run this script after your static site has already written its output folder:

```ts
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
}).build();

if (result.isErr()) {
  throw new Error(result.error.message);
}

console.log(result.value);
```

Then call it from your package script:

```json
{
  "scripts": {
    "build": "your-static-site-build && node scripts/opennav-build.mjs"
  }
}
```

## Preview Without Writing

Pass `dryRun: true` when you want the SDK to report planned changes without
writing files:

```ts
await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
}).build({ dryRun: true });
```

## What This Example Does

[`scripts/build.ts`](./scripts/build.ts) calls `OpenNavStaticSite` against this
example's `dist/` folder. The compatibility test creates the static files first,
then runs `npm run build`.

## More Options

See the root [options and file outcomes reference](../../README.md#entrypoints-and-options-reference)
for constructor fields, result fields, generated files, and `robots.txt`
access-guidance behavior.
