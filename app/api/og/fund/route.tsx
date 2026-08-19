import { ImageResponse } from 'next/og';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

// データベースに無い場合のデフォルト（大谷ファンド）
const OHTANI_SAMPLE_FUND = {
  id: '1',
  title: '大谷CM採用企業ポートフォリオ',
  author: '大谷ファン',
  description: '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！',
  items: [
    { name: 'コーセー', ratio: 30, color: '#3B82F6' },
    { name: '伊藤園', ratio: 30, color: '#10B981' },
    { name: 'セイコーグループ', ratio: 20, color: '#F59E0B' },
    { name: '西川', ratio: 20, color: '#EC4899' },
  ],
};

async function loadGoogleFont(font: string, text: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@700;900&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(url, { signal: controller.signal });
    const css = await cssRes.text();

    const resource = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);

    if (resource) {
      const fontRes = await fetch(resource[1], { signal: controller.signal });
      clearTimeout(timeoutId);
      if (fontRes.status === 200) {
        return await fontRes.arrayBuffer();
      }
    }
    clearTimeout(timeoutId);
  } catch (e) {
    console.error('font load failed:', e);
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let fund: any = OHTANI_SAMPLE_FUND;

    // IDが指定されており、かつ1以外の場合はDBから取得を試みる
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
    const description = fund.description || '俺ファンド - 仮想ポートフォリオ';

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

    // 動的フォント取得用テキスト
    const itemNames = items.map((i) => i.name).join('');
    const fontText = `${title}${author}${description}${itemNames}俺ファンド構成銘柄他0123456789%@◆:¥`;
    const fontData = await loadGoogleFont('Noto+Sans+JP', fontText);

    const fontsConfig = fontData
      ? [{ name: 'NotoSansJP', data: fontData, style: 'normal' as const, weight: 700 as const }]
      : [];

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
            fontFamily: fontData ? 'NotoSansJP, sans-serif' : 'sans-serif',
          }}
        >
          {/* 上部: サービスバッジ & 投稿者 */}
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

          {/* メイン: 1本の連結スタックバー（帯グラフ） */}
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
            {/* 1本バー本体 */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '42px',
                backgroundColor: '#1e293b',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              {calculatedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: `${Math.max(item.percent, 3)}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 900,
                    overflow: 'hidden',
                  }}
                >
                  {item.percent >= 10 ? `${item.percent}%` : ''}
                </div>
              ))}
            </div>

            {/* 銘柄一覧バッジ（色＋銘柄名＋％） */}
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
        fonts: fontsConfig,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
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