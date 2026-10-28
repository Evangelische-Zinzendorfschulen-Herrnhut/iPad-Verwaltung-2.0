import type { Metadata } from "next";
import "./globals.css";
import { ListNavigationProvider } from "./list-navigation";

export const metadata: Metadata = {
  title: "iPad-Verwaltung",
  icons: { icon: [{ url: "/bereich-icon/set", type: "image/svg+xml" }] },
  description: "Verwaltung von iPad-Sets an der Schule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ListNavigationProvider>{children}</ListNavigationProvider></body>
    </html>
  );
}
