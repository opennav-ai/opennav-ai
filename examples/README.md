# OpenNav Examples

These examples show the public `@opennav-ai/opennav` package running against
real static output. Each example is also a compatibility test: `npm run
test:examples` builds local OpenNav packages, installs packed tarballs into the
example projects, runs the example builds, and compares the final output files.

## Table Of Contents

Start with the guide that matches how you want to install OpenNav:

| Example | Use This When | Guide |
| --- | --- | --- |
| CLI build script | You already have a static build command and want to run `opennav build --static` after it. | [CLI build-script quick start](./cli-build-script/README.md) |
| Static-site SDK | You want to call `new OpenNavStaticSite(...).build()` from your own Node script. | [Static-site SDK quick start](./static-site-sdk/README.md) |
| Astro 6 | You use Astro 6 and want OpenNav to run inside `astro build`. | [Astro 6 static quick start](./astro-6-static/README.md) |
| Astro 5 | You use Astro 5 and want OpenNav to run inside `astro build`. | [Astro 5 static quick start](./astro-5-static/README.md) |
| Astro 4 | You use Astro 4 and want OpenNav to run inside `astro build`. | [Astro 4 static quick start](./astro-4-static/README.md) |
| Next 16 | You use Next 16 static export and want OpenNav to run after `next build`. | [Next 16 static quick start](./next-16-static/README.md) |
| Next 15 | You use Next 15 static export and want OpenNav to run after `next build`. | [Next 15 static quick start](./next-15-static/README.md) |
| Next 14 | You use Next 14 static export and want OpenNav to run after `next build`. | [Next 14 static quick start](./next-14-static/README.md) |

## How The Compatibility Tests Work

Run all example checks from the repository root:

```sh
npm run test:examples
```

The tests:

- Build and pack `@opennav-ai/engine` and `@opennav-ai/opennav`.
- Install those packed packages into each example instead of using workspace
  symlinks.
- Build the framework or static output.
- Run OpenNav through the example's public integration point.
- Snapshot the final output tree.

## Choosing An Integration

Use the CLI when you want the smallest setup and already have a command that
writes a static folder.

Use `OpenNavStaticSite` when you prefer a Node script, need custom setup before
or after OpenNav runs, or want to decide how typed `Result` errors are handled.

Use `OpenNavAstro` when you want Astro to run OpenNav automatically after static
build output is written.

Use `OpenNavNext` when you use Next static export and want OpenNav to run after
`next build` produces `out/`.

For every option, generated file, result field, and `robots.txt` access-guidance
outcome, read the root [options and file outcomes reference](../README.md#entrypoints-and-options-reference).
