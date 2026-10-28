import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobDesk — job application tracker",
  description:
    "Track every job you save, apply to, and interview for. Capture posts from anywhere with the browser extension.",
};

export const viewport: Viewport = {
  themeColor: "#060f14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
