/*
 * Root layout for LeeMaster Design Hub.
 * Wraps all pages in auth + theme providers.
 * Uses system font stack for Apple-style rendering.
 * Includes PWA meta tags for installability.
 */
import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LD Hub",
  description: "Business operations dashboard for LeeMaster Design",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LD Hub",
  },
};

export const viewport: Viewport = {
  themeColor: "#0071e3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
