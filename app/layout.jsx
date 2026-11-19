import "./globals.css";

export const metadata = {
  title: "Bunny Mission",
  description: "A little invitation delivered by Nibbles.",
  robots: { index: false, follow: false }
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff7ed"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}