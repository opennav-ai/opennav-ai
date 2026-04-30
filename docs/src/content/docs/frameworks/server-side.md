---
title: Server-Side Frameworks
description: Coming soon for Astro and Next.js runtime Markdown content negotiation.
---

Server-side Astro and Next.js support is coming soon. The static integrations
are the launch path today, and runtime framework support is the next track.

## Planned Support

| Framework | Status | Planned behavior |
| --------- | ------ | ---------------- |
| Astro server output | Coming soon | Markdown content negotiation for runtime routes. |
| Next.js server output | Coming soon | Markdown content negotiation for server-rendered routes. |
| Site-wide middleware | Coming soon | One default Markdown response policy for the whole app. |
| Per-endpoint middleware | Coming soon | Route-level control for pages that need custom behavior. |

## Content Negotiation

The server-side integrations will let agents request a Markdown representation
of a runtime page while people continue to receive normal HTML. This is designed
for docs, product pages, and app routes that cannot be fully exported as static
HTML during the build.

## Use Static Today

Use the current [Astro guide](/frameworks/astro/) for static Astro builds and
the current [Next.js guide](/frameworks/next/) for Next.js static exports.
