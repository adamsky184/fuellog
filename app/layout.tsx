import type { Metadata, Viewport } from "next";
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
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
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
