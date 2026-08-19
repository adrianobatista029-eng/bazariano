import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AllRotaHub",
  description: "Compre e venda com entrega rastreada",
};

const THEME_INIT_SCRIPT = `
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
