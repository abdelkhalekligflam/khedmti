import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Khedmti — Votre activité, organisée",
  description: "Clients, devis et interventions pour les artisans.",
  icons: { icon: "/khedmti-icon.svg?v=2", apple: "/khedmti-icon.svg?v=2" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
