import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
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
            justifyContent: 'space-between',
            backgroundColor: '#0f172a',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#38bdf8',
            }}
          >
            俺ファンド | ポートフォリオ共有
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '52px',
                fontWeight: 'bold',
                color: '#f8fafc',
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '26px',
                color: '#94a3b8',
              }}
            >
              {desc}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #334155',
              paddingTop: '24px',
            }}
          >
            <div style={{ fontSize: '24px', color: '#cbd5e1' }}>
              作成者: {author}
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
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}