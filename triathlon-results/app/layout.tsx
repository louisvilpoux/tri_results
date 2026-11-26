import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { OPEN_GRAPH_DEFAULTS, SITE_NAME, SITE_URL } from "@/lib/seo";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnalyticsScript } from "@/components/shared/analytics";
import { FeedbackButton } from "@/components/feedback/feedback-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "PACE — Triathlon & Duathlon",
    template: "%s | PACE",
  },
  description:
    "Retrouve les résultats, classements et performances des athlètes de triathlon et duathlon.",
  openGraph: OPEN_GRAPH_DEFAULTS,
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-[#F5F6F8] font-sans text-[#17202E] antialiased`}
      >
        <Header />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        <Footer />

        <FeedbackButton />

        <AnalyticsScript />
      </body>
    </html>
  );
}