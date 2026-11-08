import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sismos del año",
  description:
    "Mapa de los sismos fuertes del año en curso, con víctimas, noticias y análisis de patrones tectónicos. Se actualiza solo a partir de USGS, GEOFON, GDACS y Wikipedia.",
  openGraph: { title: "Sismos del año", locale: "es_419", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
