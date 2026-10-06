import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: "variable" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: "variable" });

export const metadata: Metadata = {
  title: "DHNN Skill Map",
  description: "Mapa de habilidades de DHNN",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
