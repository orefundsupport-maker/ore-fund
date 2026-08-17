import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export const runtime = 'edge';

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing Fund ID', { status: 400 });
  }

  const { data: fund } = await supabase
    .from('funds')
    .select('*')
    .eq('id', id)
    .single();

  if (!fund) {
    return new Response('Fund Not Found', { status: 404 });
  }

  const title = fund.title || '無題のファンド';
  const author = fund.author || '名無し投資家';
  const description = fund.description || '仮想ポートフォリオ';
  const items: Array<{ name: string; amount: number; color?: string; ratio?: number }> = fund.items || [];

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  let currentAngle = 0;
  const slices = items.map((item, idx) => {
    const amount = item.amount || 0;
    const ratio = totalAmount > 0 ? (amount / totalAmount) : (1 / (items.length || 1));
    const sliceAngle = ratio * 360;
    const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + safeAngle;
    currentAngle += safeAngle;

    const path = getDonutSlicePath(150, 150, 130, 75, startAngle, endAngle);
    const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const percent = Math.round(ratio * 100);

    return { name: item.name, path, color, percent };
  });

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
          backgroundColor: '#0f172a',
          padding: '50px 60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '58%',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 24, fontWeight: 'bold', color: '#818cf8' }}>
              📈 俺ファンド
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 20,
                color: '#94a3b8',
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {description}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              padding: '10px 20px',
              borderRadius: '12px',
              width: 'fit-content',
            }}
          >
            <span style={{ fontSize: 16, color: '#64748b' }}>作成者:</span>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#38bdf8' }}>
              @{author}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38%',
            height: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', position: 'relative', width: 220, height: 220 }}>
            <svg width="220" height="220" viewBox="0 0 300 300">
              {slices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} />
              ))}
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 220,
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: 14, color: '#94a3b8' }}>銘柄数</span>
              <span style={{ fontSize: 26, fontWeight: 'bold', color: '#ffffff' }}>
                {items.length}銘柄
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              width: '100%',
              marginTop: '16px',
            }}
          >
            {slices.slice(0, 3).map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: '#e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: s.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 130,
                    }}
                  >
                    {s.name}
                  </span>
                </div>
                <span style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{s.percent}%</span>
              </div>
            ))}
            {slices.length > 3 && (
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
                他 {slices.length - 3} 銘柄...
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}