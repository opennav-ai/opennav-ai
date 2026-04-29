# Static Site SDK Example

This example uses the root `OpenNavStaticSite` SDK against a plain static build
folder.

Look at:

- [`scripts/build.ts`](./scripts/build.ts) for `OpenNavStaticSite.build()`
- [`package.json`](./package.json) for the local SDK dependency

The `dist/` folder is intentionally ignored. Populate it with your static site
build output before running `npm run build`.
