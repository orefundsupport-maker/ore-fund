import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '俺ファンド - 理想の仮想ポートフォリオ作成・共有サービス';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SAMPLE_ITEMS = [
  { name: 'コーセー', percent: 30, color: '#3B82F6' },
  { name: '伊藤園', percent: 30, color: '#10B981' },
  { name: 'セイコーグループ', percent: 20, color: '#F59E0B' },
  { name: '西川', percent: 20, color: '#EC4899' },
];

export default async function Image() {
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
          padding: '44px 52px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 上部: サービスバッジ & キャッチ */}
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
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            俺ファンド
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#94a3b8', fontWeight: 700 }}>
            @大谷ファン の注目ポートフォリオ
          </div>
        </div>

        {/* タイトル & 説明 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 900,
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          >
            大谷CM採用企業ポートフォリオ
          </div>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#131b2e',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid #1e293b',
              fontSize: 20,
              color: '#94a3b8',
            }}
          >
            💬 大谷翔平選手がCM出演・スポンサー契約を結ぶ企業株だけで組んだ勝負ファンド！
          </div>
        </div>

        {/* 1本バー & 銘柄バッジ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: '#131b2e',
            padding: '20px 24px',
            borderRadius: '20px',
            border: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '38px',
              backgroundColor: '#1e293b',
              borderRadius: '9999px',
              overflow: 'hidden',
              padding: '3px',
              gap: '2px',
            }}
          >
            {SAMPLE_ITEMS.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexGrow: item.percent,
                  minWidth: '22px',
                  height: '100%',
                  backgroundColor: item.color,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 900,
                  borderRadius:
                    idx === 0
                      ? '9999px 0 0 9999px'
                      : idx === SAMPLE_ITEMS.length - 1
                      ? '0 9999px 9999px 0'
                      : '0',
                }}
              >
                {item.percent}%
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px' }}>
            {SAMPLE_ITEMS.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: item.color }}>
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
            borderTop: '1px solid #1e293b',
            paddingTop: '12px',
          }}
        >
          <div style={{ display: 'flex', fontSize: 16, color: '#64748b' }}>
            あなたならどう組む？仮想ポートフォリオ共有プラットフォーム
          </div>
          <div style={{ display: 'flex', fontSize: 16, color: '#38bdf8', fontWeight: 700 }}>
            ore-fund.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}