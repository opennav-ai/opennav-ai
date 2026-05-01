import type { ReactElement } from "react";

/**
 * Renders the nested setup route for the Next 16 example.
 *
 * @returns The static setup page content emitted by `next build`.
 */
export default function Page(): ReactElement {
  return (
    <main>
      <h1>OpenNav Next 16 Setup Fixture</h1>
      <p>This setup guide proves Next emits nested static routes.</p>
    </main>
  );
}
