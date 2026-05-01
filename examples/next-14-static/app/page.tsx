import type { ReactElement } from "react";

/**
 * Renders the root static fixture page for the Next 14 example.
 *
 * @returns The static page content emitted by `next build`.
 */
export default function Page(): ReactElement {
  return (
    <main>
      <h1>OpenNav Next 14 Static Fixture</h1>
      <p>This page proves Next can import the local OpenNav config wrapper.</p>
    </main>
  );
}
