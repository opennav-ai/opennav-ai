---
title: SDK
description: Use OpenNavStaticSite from a Node script or framework hook.
---

Use the root SDK when your script already knows the built output folder.

<p class="opennav-example-label" data-example-role="quick">Quick start</p>

```typescript
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
}).build();

if (result.isErr()) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value);
```

<p class="opennav-example-label" data-example-role="full">Full example</p>

```typescript
import { OpenNavStaticSite } from "@opennav-ai/opennav";

const result = await new OpenNavStaticSite({
  siteName: "Example Docs",
  siteUrl: "https://example.com",
  outputDirectory: "dist",
  preset: "astro",
  accessGuidance: {
    contentSignals: {
      search: "allow",
      aiInput: "allow",
      aiTrain: "disallow",
    },
  },
}).build({ dryRun: true });

if (result.isErr()) {
  console.error(result.error.message);
  process.exit(1);
}

console.log(result.value);
```

## Options

| SDK option | Required | What it means | File outcome |
| ---------- | -------- | ------------- | ------------ |
| `siteName` | Yes | Human-readable site or docs name. | Appears in generated OpenNav files. |
| `siteUrl` | Yes | Public deployed site URL, including protocol and host. | Controls generated links and manifest URLs. |
| `outputDirectory` | Yes | Built static folder to read and modify. | OpenNav reads from and writes to this folder only. |
| `preset` | No | Framework hint. Supported values are `"astro"` and `"next-export"`. | Uses framework-specific static folder conventions when available. |
| `accessGuidance` | No | Site-owner access preferences for generated policy guidance. | Only affects `robots.txt`, and only when configured. |
| `build({ dryRun })` | No | Preview mode when `dryRun: true`. | Leaves files unchanged when enabled. |
