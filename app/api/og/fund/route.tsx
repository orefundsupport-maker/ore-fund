import { ImageResponse } from 'next/og';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

async function loadGoogleFont(font: string, text: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

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

    if (!id) return new Response('Missing Fund ID', { status: 400 });

    const { data: fund, error } = await supabase
      .from('funds')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !fund) return new Response('Fund Not Found', { status: 404 });

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
            padding: '45px 55px',
            fontFamily: fontData ? 'NotoSansJP, sans-serif' : 'sans-serif',
          }}
        >
          {/* 上部: サービスバッジ & 投稿者情報 */}
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
                padding: '6px 18px',
                borderRadius: '9999px',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              俺ファンド
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: '#94a3b8', fontWeight: 700 }}>
              @{author} のポートフォリオ
            </div>
          </div>

          {/* タイトル & 説明文 */}
          <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                fontWeight: 900,
                color: '#f8fafc',
                lineHeight: 1.2,
                maxWidth: '1080px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </div>
          </div>

          {/* メイン: 横棒グラフ（バーチャート）エリア */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#131b2e',
              padding: '20px 24px',
              borderRadius: '20px',
              border: '1px solid #1e293b',
            }}
          >
            {calculatedItems.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  width: '100%',
                }}
              >
                {/* 銘柄名 & ％ */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: item.color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        maxWidth: '750px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: '#ffffff',
                    }}
                  >
                    {item.percent}%
                  </span>
                </div>

                {/* 横棒バー本体 */}
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: '14px',
                    backgroundColor: '#1e293b',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(Math.max(item.percent, 3), 100)}%`,
                      height: '100%',
                      backgroundColor: item.color,
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            ))}

            {calculatedItems.length > 4 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  fontSize: 16,
                  color: '#94a3b8',
                  marginTop: '2px',
                }}
              >
                他 {calculatedItems.length - 4} 銘柄
              </div>
            )}
          </div>

          {/* フッター */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              borderTop: '1px solid #334155',
              paddingTop: '12px',
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