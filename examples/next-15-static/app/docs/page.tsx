import type { ReactElement } from "react";

/**
 * Renders the docs route for the Next 15 example.
 *
 * @returns The static docs page content emitted by `next build`.
 */
export default function Page(): ReactElement {
  return (
    <main>
      <h1>OpenNav Next 15 Docs Fixture</h1>
      <p>This docs page proves Next emits additional static routes.</p>
    </main>
  );
}
