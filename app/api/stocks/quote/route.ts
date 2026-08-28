import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // 4桁の数字かチェック
  if (!code || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: '4桁の有効な証券コードを指定してください' }, { status: 400 });
  }

  try {
    // 東証銘柄用ティッカー（例: 7203.T）
    const symbol = `${code}.T`;
    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;

    const res = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 }, // 1時間キャッシュしてアクセス負荷を軽減
    });

    if (!res.ok) {
      return NextResponse.json({ error: '株価の取得に失敗しました' }, { status: 404 });
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    
    // null や undefined を除外して直近の確定終値（前日終値）を取得
    const validCloses = closes.filter((c): c is number => c !== null && c !== undefined && !isNaN(c));

    if (validCloses.length === 0) {
      return NextResponse.json({ error: '株価データが存在しません' }, { status: 404 });
    }

    // 直近の確定終値を四捨五入して整数に
    const previousClose = Math.round(validCloses[validCloses.length - 1]);

    return NextResponse.json({
      code,
      name: result?.meta?.shortName || result?.meta?.symbol || code,
      closePrice: previousClose,
    });
  } catch (err) {
    console.error('株価取得エラー:', err);
    return NextResponse.json({ error: '内部エラーが発生しました' }, { status: 500 });
  }
}