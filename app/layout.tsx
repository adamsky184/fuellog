import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { SWRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "FuelLog — evidence tankování",
  description: "Evidence tankování, statistiky spotřeby a sdílení mezi uživateli.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        {children}
        <Footer />
        <SWRegister />
      </body>
    </html>
  );
}
