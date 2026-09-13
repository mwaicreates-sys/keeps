import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Baloo_2 } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "keeps",
  description: "A private space for the two of you. Fun now, worth keeping later.",
  applicationName: "Keeps",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "keeps" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Zero-network-cost safety net against a flash-of-unstyled-content
          window on a slow connection: on a weak/high-latency connection,
          Chrome can paint the page before the external stylesheet finishes
          loading rather than block indefinitely. Until that stylesheet
          arrives, a plain <img> has no width constraint and renders at its
          native pixel size (a real photo is often 1000px+ wide), which
          overflows a phone-width screen — this is a plausible explanation
          for reports of images/content bleeding past the right edge that a
          fast-network render never reproduces. This inline style is part
          of the initial HTML itself (no request needed) so it's active
          from the very first paint, before globals.css can possibly have
          loaded.
        */}
        <style>{`html,body{max-width:100%;overflow-x:hidden}img,video{max-width:100%;height:auto}`}</style>
      </head>
      <body className={`${fraunces.variable} ${inter.variable} ${baloo.variable} antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
