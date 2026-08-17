// app/api/og/fund/route.tsx
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '俺ファンド';
    const author = searchParams.get('author') || '名無し投資家';
    const desc = searchParams.get('desc') || 'オリジナル仮想ポートフォリオ';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a',
            padding: '60px 80px',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                backgroundColor: '#38bdf8',
              }}
            />
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#94a3b8' }}>
              俺ファンド | ポートフォリオ共有
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: '52px',
                fontWeight: 'bold',
                lineHeight: 1.2,
                color: '#f8fafc',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '26px', color: '#94a3b8' }}>
              {desc.length > 50 ? `${desc.slice(0, 50)}...` : desc}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #334155',
              paddingTop: '24px',
            }}
          >
            <div style={{ fontSize: '24px', color: '#cbd5e1' }}>
              作成者: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{author}</span>
            </div>
            <div style={{ fontSize: '22px', color: '#64748b' }}>
              ore-fund.vercel.app
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}