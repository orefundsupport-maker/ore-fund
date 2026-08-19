import { ImageResponse } from 'next/og';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

function getDonutSlicePath(
  cx: number, cy: number, rOuter: number, rInner: number,
  startAngleDeg: number, endAngleDeg: number
) {
  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180;
  const x1Outer = cx + rOuter * Math.cos(startRad);
  const y1Outer = cy + rOuter * Math.sin(startRad);
  const x2Outer = cx + rOuter * Math.cos(endRad);
  const y2Outer = cy + rOuter * Math.sin(endRad);
  const x1Inner = cx + rInner * Math.cos(endRad);
  const y1Inner = cy + rInner * Math.sin(endRad);
  const x2Inner = cx + rInner * Math.cos(startRad);
  const y2Inner = cy + rInner * Math.sin(startRad);
  const largeArcFlag = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return [
    `M ${x1Outer} ${y1Outer}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
    `L ${x1Inner} ${y1Inner}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
    'Z',
  ].join(' ');
}

async function loadGoogleFont(font: string, text: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://fonts.googleapis.com/css2?family=${font}:wght@700&text=${encodeURIComponent(text)}`;
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
      return {
        name: String(item?.name || `銘柄${idx + 1}`),
        amount,
        color: item?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
    });

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    let currentAngle = 0;
    const slices = items.map((item) => {
      const ratio = totalAmount > 0 ? item.amount / totalAmount : 1 / (items.length || 1);
      const sliceAngle = ratio * 360;
      const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
      const startAngle = currentAngle;
      const endAngle = currentAngle + safeAngle;
      currentAngle += safeAngle;

      const path = getDonutSlicePath(130, 130, 110, 60, startAngle, endAngle);
      const percent = Math.round(ratio * 100);
      return { ...item, path, percent };
    });

    const fontText = `${title}${author}${description}俺ファンド銘柄他0123456789%@◆`;
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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#090d16',
            padding: '50px',
            fontFamily: fontData ? 'NotoSansJP, sans-serif' : 'sans-serif',
          }}
        >
          {/* 左: ドーナツチャート */}
          <div style={{ display: 'flex', width: 280, height: 280, flexShrink: 0 }}>
            <svg width="280" height="280" viewBox="0 0 260 260">
              {slices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} />
              ))}
              <circle cx="130" cy="130" r="58" fill="#090d16" />
            </svg>
          </div>

          {/* 右: テキスト情報 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              height: '100%',
              marginLeft: 50,
            }}
          >
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#38bdf8' }}>
              俺ファンド | ポートフォリオ共有
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 48,
                fontWeight: 700,
                color: '#f8fafc',
                marginTop: 24,
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: '#94a3b8',
                marginTop: 14,
              }}
            >
              {description.length > 40 ? description.slice(0, 40) + '…' : description}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: 'auto',
                borderTop: '1px solid #334155',
                paddingTop: 20,
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, color: '#cbd5e1' }}>
                作成者: {author}
              </div>
              <div style={{ display: 'flex', fontSize: 20, color: '#64748b' }}>
                {items.length}銘柄 / ore-fund.vercel.app
              </div>
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