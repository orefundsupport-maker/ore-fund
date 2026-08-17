import { Metadata } from 'next';
import { supabase } from '@/app/lib/supabase';
import FundDetailContent from './FundDetailContent';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: fund } = await supabase
    .from('funds')
    .select('title, author, description')
    .eq('id', id)
    .single();

  const title = fund?.title || '俺ファンド';
  const author = fund?.author || '名無し投資家';
  const description = fund?.description || 'オリジナル仮想ポートフォリオプラットフォーム';

  // APIルート側に id を渡す（円グラフ描画に必要）+ キャッシュ破棄用のパラメータ
  const imageUrl = `https://ore-fund.vercel.app/api/og/fund?id=${id}&v=2`;

  return {
    metadataBase: new URL('https://ore-fund.vercel.app'),
    title: `${title} | 俺ファンド`,
    description: description,
    openGraph: {
      title: `${title} | 俺ファンド`,
      description: description,
      url: `/fund/${id}`,
      siteName: '俺ファンド',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 俺ファンド`,
      description: description,
      images: [imageUrl],
    },
  };
}

export default function FundDetailPage({ params }: Props) {
  return <FundDetailContent params={params} />;
}