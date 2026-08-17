// app/fund/[id]/page.tsx
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

  const ogUrl = new URL('https://ore-fund.vercel.app/api/og/fund');
  ogUrl.searchParams.set('title', title);
  ogUrl.searchParams.set('author', author);
  ogUrl.searchParams.set('desc', description);

  return {
    title: `${title} | 俺ファンド`,
    description: description,
    openGraph: {
      title: `${title} | 俺ファンド`,
      description: description,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 俺ファンド`,
      description: description,
      images: [ogUrl.toString()],
    },
  };
}

export default function FundDetailPage({ params }: Props) {
  return <FundDetailContent params={params} />;
}