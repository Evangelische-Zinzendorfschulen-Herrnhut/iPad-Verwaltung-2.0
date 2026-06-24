import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPad-Verwaltung",
  description: "Verwaltung von iPad-Sets an der Schule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
