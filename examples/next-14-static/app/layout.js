export const metadata = {
  title: "OpenNav Next 14 Static Fixture",
  description:
    "Pinned Next 14 static example for OpenNav package compatibility.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
