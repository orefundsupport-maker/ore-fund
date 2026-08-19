import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 大谷翔平ファンド（ID: 1）のOGP画像URL
const topOgpImageUrl = "https://ore-fund.vercel.app/api/og/fund?id=1&t=20260820v1";

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
    images: [
      {
        url: topOgpImageUrl,
        width: 1200,
        height: 630,
        alt: "大谷CM採用企業ポートフォリオ - 俺ファンド",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
    images: [topOgpImageUrl],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 📊 Google アナリティクス (GA4) 測定タグ */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-8TTQV42GW0"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-8TTQV42GW0');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}