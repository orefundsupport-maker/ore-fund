import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCode = searchParams.get('code');

  if (!rawCode || !/^[0-9A-Za-z]{4}$/.test(rawCode)) {
    return NextResponse.json({ error: '4桁の有効な証券コードを指定してください' }, { status: 400 });
  }

  const code = rawCode.toUpperCase();
  const markets = ['T', 'NG', 'N', 'S', 'F'];

  try {
    let result = null;

    // 1. 米国Yahoo Finance APIで試行
    for (const m of markets) {
      const symbol = `${code}.${m}`;
      const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;

      try {
        const res = await fetch(yfUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const resData = data?.chart?.result?.[0];
          if (resData && (resData.meta?.regularMarketPrice || resData.indicators?.quote?.[0]?.close?.length)) {
            result = resData;
            break;
          }
        }
      } catch {
        // 次の市場を試行
      }
    }

    if (result) {
      const meta = result?.meta;
      const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
      const validCloses = closes.filter((c): c is number => c !== null && c !== undefined && !isNaN(c));

      const latestRawPrice =
        meta?.regularMarketPrice ??
        (validCloses.length > 0 ? validCloses[validCloses.length - 1] : null) ??
        meta?.chartPreviousClose ??
        meta?.previousClose;

      if (latestRawPrice !== null && latestRawPrice !== undefined && !isNaN(latestRawPrice)) {
        return NextResponse.json({
          code,
          name: meta?.shortName || meta?.symbol || code,
          closePrice: Math.round(latestRawPrice),
        });
      }
    }

    // 2. 日本版Yahoo!ファイナンスのHTMLフォールバック
    const jpTargets = [`${code}.N`, `${code}.T`, code];

    for (const target of jpTargets) {
      try {
        const targetUrl = `https://finance.yahoo.co.jp/quote/${target}`;
        const jpRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        });

        console.log(`[Quote API] fetch: ${targetUrl} status: ${jpRes.status}`);

        if (!jpRes.ok) continue;

        const html = await jpRes.text();

        // 企業名の抽出
        let companyName = code;
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);

        const rawTitle = h1Match ? h1Match[1] : (titleMatch ? titleMatch[1] : '');
        if (rawTitle) {
          companyName = rawTitle
            .replace(/<[^>]+>/g, '')
            .replace(/【.*?】/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/（.*?）/g, '')
            .replace(/の株価.*$/i, '')
            .replace(/：.*$/, '')
            .replace(/-.*$/, '')
            .trim();
        }

        // ページ内の株価候補数値を網羅的に抽出
        const candidates: number[] = [];

        // 候補抽出A: styledPrice / _price_ クラス内の数値
        const classMatches = html.matchAll(/class="[^"]*(?:styledPrice|_price_)[^"]*"[^>]*>([0-9,]+(?:\.[0-9]+)?)</gi);
        for (const m of classMatches) {
          const val = Math.round(parseFloat(m[1].replace(/,/g, '')));
          if (val > 0 && String(val) !== code && !candidates.includes(val)) {
            candidates.push(val);
          }
        }

        // 候補抽出B: テキスト中の "終値 XXX円" や "現在値 XXX円"
        const textMatches = html.matchAll(/(?:株価|現在値|終値|前日終値)[^\d]*([0-9,]+(?:\.[0-9]+)?)\s*円/gi);
        for (const m of textMatches) {
          const val = Math.round(parseFloat(m[1].replace(/,/g, '')));
          if (val > 0 && String(val) !== code && !candidates.includes(val)) {
            candidates.push(val);
          }
        }

        console.log(`[Quote API] ${code} の株価候補一覧:`, candidates);

        if (candidates.length > 0) {
          // 候補がある場合、最初のメイン株価を採用（ログで他の数値も確認可能）
          const finalPrice = candidates[0];
          console.log(`[Quote API] 採用価格: ${companyName} -> ${finalPrice}円`);

          return NextResponse.json({
            code,
            name: companyName || code,
            closePrice: finalPrice,
          });
        }
      } catch (e) {
        console.error(`[Quote API] エラー (${target}):`, e);
      }
    }

    return NextResponse.json({ error: '株価の取得に失敗しました' }, { status: 404 });
  } catch (err) {
    console.error('株価取得エラー:', err);
    return NextResponse.json({ error: '内部エラーが発生しました' }, { status: 500 });
  }
}