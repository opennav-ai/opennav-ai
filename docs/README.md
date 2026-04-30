# OpenNav AI Docs

This folder is a self-contained Astro Starlight documentation site for OpenNav
AI.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static site is written to `dist/`. Cloudflare Pages can use this folder as
the project root, run `npm run build`, and publish `dist/`.

The current configured site URL is `https://docs.opennav-ai.com`. Update
`astro.config.mjs` if the docs domain changes before launch.
