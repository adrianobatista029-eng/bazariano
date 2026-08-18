import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AllRotaHub",
  description: "Compre e venda com entrega rastreada",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
