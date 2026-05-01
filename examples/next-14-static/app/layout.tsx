import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

interface RootLayoutProps {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  title: "OpenNav Next 14 Static Fixture",
  description:
    "Pinned Next 14 static example for OpenNav package compatibility.",
};

/**
 * Renders the shared document shell for the Next 14 fixture routes.
 *
 * @param props - Layout children supplied by the Next app router.
 * @returns The HTML document shell emitted by `next build`.
 */
export default function RootLayout({
  children,
}: RootLayoutProps): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
