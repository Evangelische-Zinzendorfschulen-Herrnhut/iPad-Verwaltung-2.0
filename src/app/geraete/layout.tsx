import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: { icon: [{ url: "/bereich-icon/devices", type: "image/svg+xml" }] },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
