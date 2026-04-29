export const metadata = {
  title: "OpenNav Next 16 Static Fixture",
  description:
    "Pinned Next 16 static fixture for OpenNav package compatibility.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
