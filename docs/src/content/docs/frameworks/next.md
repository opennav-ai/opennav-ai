---
title: Next.js
description: Run OpenNav after a supported Next.js static export build.
---

Next.js support is for static export builds.

<p class="opennav-example-label" data-example-role="quick">Quick start</p>

```typescript
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
})(nextConfig);
```

<p class="opennav-example-label" data-example-role="full">Full example</p>

```typescript
import { OpenNavNext } from "@opennav-ai/opennav/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default OpenNavNext({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  mode: "static",
  outputDirectory: "out",
  accessGuidance: {
    contentSignals: {
      search: "allow",
      aiInput: "allow",
      aiTrain: "disallow",
    },
  },
})(nextConfig);
```

## Options

| Next option | Required | What it means | File outcome |
| ----------- | -------- | ------------- | ------------ |
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | Yes | Public deployed site URL. | Controls generated links and manifest URLs. |
| `mode` | No | Static mode. Defaults to `"static"`. | OpenNav runs only when Next config uses `output: "export"`. |
| `outputDirectory` | No | Static export folder. Defaults to `out`. | OpenNav reads and writes that folder after `next build`. |
| `accessGuidance` | No | Same access policy object used by the SDK. | Only affects `out/robots.txt`, and only when configured. |

## Server-Side Support

Next.js server output support is coming soon. Static exports are supported
today; runtime Markdown content negotiation will follow through server-side
middleware. See the [server-side framework roadmap](/frameworks/server-side/).
