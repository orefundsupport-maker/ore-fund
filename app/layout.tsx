import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🌐 X（Twitter）や検索エンジン向けのメタデータ・OGP設定
export const metadata: Metadata = {
  metadataBase: new URL("https://orefund.netlify.app"),
  title: {
    default: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    template: "%s | 俺ファンド",
  },
  description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
  openGraph: {
    title: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
    url: "https://orefund.netlify.app",
    siteName: "俺ファンド",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス",
    description: "自分だけのオリジナル投資信託・株式ポートフォリオを作成して共有できるプラットフォーム「俺ファンド」。",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}