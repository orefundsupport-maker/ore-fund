import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// 使用する文字列に含まれるグリフだけを持つ日本語フォントを動的取得
async function getNotoSansJP(text: string, weight: 400 | 700 = 700) {
  const params = new URLSearchParams({
    family: `Noto Sans JP:wght@${weight}`,
    text, // 必要な文字だけを動的にサブセット化
  });

  const cssRes = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
    headers: {
      // WOFF2非対応の古いSafariを装うことで、Googleに強制的にTTFを返させる
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2',
    },
  });
  const css = await cssRes.text();

  // truetype, opentype, woff を抽出
  const match = css.match(/src: url\(([^)]+)\) format\('(truetype|opentype|woff)'\)/);
  if (!match) {
    console.error('Google Fonts CSS response:', css);
    throw new Error('フォントURLの取得に失敗しました');
  }

  const fontRes = await fetch(match[1]);
  if (fontRes.status !== 200) throw new Error('フォントファイルの取得に失敗しました');

  return fontRes.arrayBuffer();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '俺ファンド';
    const author = searchParams.get('author') || '名無し投資家';
    const desc = searchParams.get('desc') || 'オリジナル仮想ポートフォリオ';

    // 画像内で実際に使う全文字列をまとめて重複除去
    const allText = Array.from(
      new Set(
        `俺ファンド|ポートフォリオ共有${title}${desc}作成者:${author}ore-fund.vercel.app`
      )
    ).join('');

    const fontData = await getNotoSansJP(allText, 700);

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
            fontFamily: '"Noto Sans JP"',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#38bdf8',
              display: 'flex',
            }}
          >
            俺ファンド | ポートフォリオ共有
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: '#f8fafc',
                lineHeight: 1.2,
                display: 'flex',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 26, color: '#94a3b8', display: 'flex' }}>
              {desc}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid #334155',
              paddingTop: 24,
            }}
          >
            <div style={{ fontSize: 24, color: '#cbd5e1', display: 'flex' }}>
              作成者: {author}
            </div>
            <div style={{ fontSize: 22, color: '#64748b', display: 'flex' }}>
              ore-fund.vercel.app
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Noto Sans JP',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}