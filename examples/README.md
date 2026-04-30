# OpenNav Examples

This folder contains small, pinned example projects that show how the public
`@opennav-ai/opennav` package is meant to be used from real static-site builds.

The examples are also compatibility checks. Running `npm run test:examples`
from the repo root builds the local OpenNav packages, installs each pinned
example from its `package-lock.json`, and installs packed local tarballs rather
than workspace symlinks.

Static SDK, Astro, and Next examples use `examples/tests/` Vitest snapshots.
They first prove the original framework/static output is stable, then run
OpenNav and compare the full modified output tree.

The static-site SDK example shows the root `OpenNavStaticSite` class running
against plain HTML without a framework.

The CLI build-script example shows the package-script shape users will copy once
the `opennav static` command behavior is implemented.

## Examples

- [Astro 6 static SDK](./astro-6-static/README.md)
- [Astro 5 static SDK](./astro-5-static/README.md)
- [Astro 4 static SDK](./astro-4-static/README.md)
- [Next 16 static SDK](./next-16-static/README.md)
- [Next 15 static SDK](./next-15-static/README.md)
- [Next 14 static SDK](./next-14-static/README.md)
- [Static site SDK](./static-site-sdk/README.md)
- [CLI build-script shape](./cli-build-script/README.md)
