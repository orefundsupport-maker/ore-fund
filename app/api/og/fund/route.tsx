import { ImageResponse } from 'next/og';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';

const DEFAULT_COLORS = [
  '#2563EB', '#EA580C', '#16A34A', '#9333EA',
  '#DC2626', '#CA8A04', '#DB2777', '#0D9488',
  '#4F46E5', '#65A30D', '#C026D3', '#B45309',
];

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          color: '#38bdf8',
          fontSize: 48,
          fontWeight: 900,
        }}
      >
        俺ファンド
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return new Response('Missing ID', { status: 400 });

    const { data: fund } = await supabase
      .from('funds')
      .select('title, author, items')
      .eq('id', id)
      .single();

    const title = fund?.title || '無題のファンド';
    const author = fund?.author || '名無し投資家';

    let rawItems: any[] = [];
    if (Array.isArray(fund?.items)) {
      rawItems = fund.items;
    } else if (typeof fund?.items === 'string') {
      try {
        rawItems = JSON.parse(fund.items);
      } catch {
        rawItems = [];
      }
    }

    const items = rawItems.map((item, idx) => ({
      name: String(item?.name || `銘柄${idx + 1}`),
      percent: item?.ratio ? parseFloat(item.ratio) : 0,
      color: item?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    }));

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

          <div
            style={{
              display: 'flex',
              fontSize: 44,
              fontWeight: 900,
              color: '#f8fafc',
              maxWidth: '1080px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </div>

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
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexGrow: item.percent,
                    minWidth: '24px',
                    height: '100%',
                    backgroundColor: item.color,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  {item.percent >= 8 ? `${item.percent}%` : ''}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{item.name}</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>

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
              仮想ポートフォリオ共有プラットフォーム
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
    console.error('OGP generation failed:', err);
    return fallbackImage();
  }
}