import type { Metadata, Viewport } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Open-source typefaces, downloaded at build time and served from our own domain.
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const heading = Source_Serif_4({ variable: "--font-heading", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Nyem Aka", template: "%s · Nyem Aka" },
  description:
    "Report a maintenance fault on campus and follow it until it is fixed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
