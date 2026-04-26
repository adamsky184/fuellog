import type { Metadata, Viewport } from "next";
// v2.14.0 — premium typography via self-hosted @fontsource. Google Fonts
// would be blocked from this build environment; @fontsource ships the
// woff2 files inside the bundle and exposes them as plain CSS imports.
// Inter for body, JetBrains Mono for tabular numerics. CSS variable names
// match what tailwind.config.ts + globals.css expect.
import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { Footer } from "@/components/footer";
import { SWRegister } from "@/components/sw-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { siteUrl } from "@/lib/site-url";

const SITE = siteUrl();
const TITLE = "FuelLog — evidence tankování";
const DESCRIPTION =
  "Evidence tankování, statistiky spotřeby, sdílení vozidel a OCR účtenek. Zdarma, PWA, funguje offline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: TITLE,
    template: "%s · FuelLog",
  },
  description: DESCRIPTION,
  applicationName: "FuelLog",
  keywords: [
    "tankování",
    "spotřeba",
    "benzin",
    "nafta",
    "evidence",
    "auto",
    "fleet",
    "FuelLog",
  ],
  manifest: "/manifest.json",
  // v2.7.1 — favicon + apple-touch served from app/favicon.ico, app/icon.png,
  // app/apple-icon.png via Next's metadata file conventions. Keep an explicit
  // shortcut entry too so older browsers/crawlers see the maskable PNG.
  icons: {
    shortcut: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: SITE,
    siteName: "FuelLog",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "FuelLog",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#059669" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Inline no-flash theme init — runs before first paint so the <html> class
// matches the stored preference and we don't see a light flash on dark mode.
const themeInit = `
(function(){try{
  var t = localStorage.getItem('fuellog-theme');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  if(t === 'dark'){ document.documentElement.classList.add('dark'); }
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
        <Footer />
        <SWRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
