import { ImageResponse } from 'next/og';
import { supabase } from '@/app/lib/supabase';

// Edge Runtimeで超高速起動
export const runtime = 'edge';

// 視認性の高い12色のカラーパレット
const DEFAULT_COLORS = [
  '#2563EB', '#EA580C', '#16A34A', '#9333EA',
  '#DC2626', '#CA8A04', '#DB2777', '#0D9488',
  '#4F46E5', '#65A30D', '#C026D3', '#B45309',
];

const OHTANI_SAMPLE_FUND = {
  id: '1',
  title: '大谷CM採用企業ポートフォリオ',
  author: '大谷ファン',
  description: '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！',
  items: [
    { name: 'コーセー', ratio: 30, color: '#2563EB' },
    { name: '伊藤園', ratio: 30, color: '#16A34A' },
    { name: 'セイコーグループ', ratio: 20, color: '#EA580C' },
    { name: '西川', ratio: 20, color: '#DB2777' },
  ],
};

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let fund: any = OHTANI_SAMPLE_FUND;

    if (id && id !== '1') {
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        fund = data;
      }
    }

    const title = fund.title || '無題のファンド';
    const author = fund.author || '名無し投資家';

    let rawItems: any[] = [];
    if (Array.isArray(fund.items)) {
      rawItems = fund.items;
    } else if (typeof fund.items === 'string') {
      try {
        rawItems = JSON.parse(fund.items);
      } catch {
        rawItems = [];
      }
    }

    if (rawItems.length === 0 && fund.items) {
      rawItems = fund.items;
    }

    const items = rawItems.map((item, idx) => {
      const p = parseFloat(item?.price) || 0;
      const s = parseFloat(item?.shares) || 1;
      const amount = parseFloat(item?.amount) || p * s || 0;
      const ratio = item?.ratio ? parseFloat(item.ratio) : 0;
      return {
        name: String(item?.name || `銘柄${idx + 1}`),
        amount,
        ratio,
        color: item?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
    });

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const calculatedItems = items.map((item) => {
      let percent = item.ratio;
      if (!percent && totalAmount > 0) {
        percent = Math.round((item.amount / totalAmount) * 100);
      }
      if (!percent) {
        percent = Math.round(100 / (items.length || 1));
      }
      return {
        ...item,
        percent,
      };
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#090d16',
            padding: '50px 60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* 上部: バッジ & 投稿者 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#38bdf8',
                color: '#090d16',
                padding: '6px 20px',
                borderRadius: '9999px',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              俺ファンド
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8', fontWeight: 700 }}>
              @{author} のポートフォリオ
            </div>
          </div>

          {/* タイトル */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 44,
                fontWeight: 900,
                color: '#f8fafc',
                lineHeight: 1.25,
                maxWidth: '1080px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </div>
          </div>

          {/* メイン: 1本スタックバー（帯グラフ） */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: '#131b2e',
              padding: '24px 28px',
              borderRadius: '24px',
              border: '1px solid #1e293b',
            }}
          >
            {/* 1本バー */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '42px',
                backgroundColor: '#1e293b',
                borderRadius: '9999px',
                overflow: 'hidden',
                padding: '3px',
                gap: '2px',
              }}
            >
              {calculatedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexGrow: Math.max(item.percent, 3),
                    minWidth: '24px',
                    height: '100%',
                    backgroundColor: item.color,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 900,
                    overflow: 'hidden',
                    borderRadius:
                      idx === 0
                        ? '9999px 0 0 9999px'
                        : idx === calculatedItems.length - 1
                        ? '0 9999px 9999px 0'
                        : '0',
                  }}
                >
                  {item.percent >= 8 ? `${item.percent}%` : ''}
                </div>
              ))}
            </div>

            {/* 銘柄一覧バッジ */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px 20px',
                alignItems: 'center',
              }}
            >
              {calculatedItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                    }}
                  />
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: item.color }}>
                    {item.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* フッター */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              borderTop: '1px solid #334155',
              paddingTop: '16px',
            }}
          >
            <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>
              あなたならどう組む？仮想ポートフォリオ共有プラットフォーム
            </div>
            <div style={{ display: 'flex', fontSize: 18, color: '#38bdf8', fontWeight: 700 }}>
              ore-fund.vercel.app
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        },
      }
    );
  } catch (err) {
    console.error('OGP Error:', err);
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: '#090d16',
            color: '#fff',
            fontSize: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          俺ファンド
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}