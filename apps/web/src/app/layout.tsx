import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finetra — Wealth Intelligence Platform",
  description: "Your personal AI-powered financial intelligence dashboard. Track cashflow, assets, portfolio, tax optimization, and FIRE progress in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col relative">
        <div className="bg-mesh" aria-hidden="true" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
