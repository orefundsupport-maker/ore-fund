import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ore-fund.vercel.app"),
  title: {
    default: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    template: "%s | 俺ファンド",
  },
  description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
  openGraph: {
    title: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
    url: "https://ore-fund.vercel.app",
    siteName: "俺ファンド",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
  },
  verification: {
    google: "Fq1AsRfZt9tHMSRxU1fY0AyHzWCWopdoqQ8X0hJcXJ0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Analytics />
        {children}
      </body>
    </html>
  );
}