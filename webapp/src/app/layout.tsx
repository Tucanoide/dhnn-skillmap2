import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DHNN Skill Map",
  description: "Mapa de habilidades de DHNN",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
