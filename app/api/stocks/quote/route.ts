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
      next: { revalidate: 300 }, // キャッシュを5分に短縮して最新終値の反映遅延を防止
    });

    if (!res.ok) {
      return NextResponse.json({ error: '株価の取得に失敗しました' }, { status: 404 });
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter((c): c is number => c !== null && c !== undefined && !isNaN(c));

    // 15:30以降〜翌朝まで常に確定した直近終値を保持している regularMarketPrice を最優先で取得
    const latestRawPrice =
      meta?.regularMarketPrice ??
      (validCloses.length > 0 ? validCloses[validCloses.length - 1] : null) ??
      meta?.chartPreviousClose ??
      meta?.previousClose;

    if (latestRawPrice === null || latestRawPrice === undefined || isNaN(latestRawPrice)) {
      return NextResponse.json({ error: '株価データが存在しません' }, { status: 404 });
    }

    // 直近確定終値を四捨五入して整数に
    const finalClosePrice = Math.round(latestRawPrice);

    return NextResponse.json({
      code,
      name: meta?.shortName || meta?.symbol || code,
      closePrice: finalClosePrice,
    });
  } catch (err) {
    console.error('株価取得エラー:', err);
    return NextResponse.json({ error: '内部エラーが発生しました' }, { status: 500 });
  }
}