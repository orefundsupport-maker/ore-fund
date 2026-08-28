'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  code?: string;
  price?: number | string;
  base_price?: number | string;
  shares?: number | string;
  amount?: number | string;
  ratio?: number | string;
  color?: string;
};

type Fund = {
  id: string;
  title: string;
  author: string;
  funny_count: number;
  description: string;
  total_amount?: number | string;
  items: FundItem[];
  created_at?: string;
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

function formatCreatedAt(dateString?: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

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

function computeFundPerformance(fund: Fund, latestPrices: Record<string, number>) {
  let rawItems: any[] = [];
  if (Array.isArray(fund.items)) rawItems = fund.items;
  else if (typeof fund.items === 'string') {
    try { rawItems = JSON.parse(fund.items); } catch { rawItems = []; }
  }

  let baseTotal = 0;
  let currentTotal = 0;
  let hasPrices = false;

  const formattedItems = rawItems.map((item, idx) => {
    const name = (item.name || `銘柄${idx + 1}`).trim();
    const code = item.code || (name.match(/\b\d{4}\b/) ? name.match(/\b\d{4}\b/)![0] : undefined);
    const basePrice = item.base_price !== undefined && item.base_price !== null && item.base_price !== ''
      ? Number(item.base_price)
      : (item.price !== undefined && item.price !== null && item.price !== '' ? Number(item.price) : undefined);
    const shares = item.shares !== undefined && item.shares !== null && item.shares !== '' ? Number(item.shares) : undefined;

    let baseAmt = item.amount !== undefined && item.amount !== null && item.amount !== '' ? Math.floor(Number(item.amount)) : 0;
    if (!baseAmt && basePrice !== undefined && shares !== undefined) {
      baseAmt = Math.floor(basePrice * shares);
    }
    baseTotal += baseAmt;

    const currentPrice = code && latestPrices[code] ? latestPrices[code] : undefined;
    let currentAmt = baseAmt;
    if (currentPrice !== undefined && shares !== undefined) {
      currentAmt = Math.floor(currentPrice * shares);
      hasPrices = true;
    }
    currentTotal += currentAmt;

    let changeRate: number | null = null;
    if (currentPrice !== undefined && basePrice !== undefined && basePrice > 0) {
      changeRate = parseFloat((((currentPrice - basePrice) / basePrice) * 100).toFixed(2));
    }

    return {
      name,
      code,
      basePrice,
      currentPrice,
      changeRate,
      shares,
      baseAmt,
      currentAmt,
      ratio: item.ratio ? Number(item.ratio) : 0,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    };
  });

  const finalBaseTotal = fund.total_amount ? Math.floor(Number(fund.total_amount)) : baseTotal;
  let returnRate: number | null = null;
  if (hasPrices && finalBaseTotal > 0) {
    returnRate = parseFloat((((currentTotal - finalBaseTotal) / finalBaseTotal) * 100).toFixed(2));
  }

  return {
    items: formattedItems,
    baseTotal: finalBaseTotal,
    currentTotal: hasPrices ? currentTotal : undefined,
    returnRate,
  };
}

export default function FundDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;

  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [hasReacted, setHasReacted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reacted_funds');
      if (saved && JSON.parse(saved).includes(id)) {
        setHasReacted(true);
      }
    } catch {
      // ignore
    }

    async function fetchFund() {
      setLoading(true);
      const { data, error } = await supabase.from('funds').select('*').eq('id', id).single();

      if (!error && data) {
        setFund(data);

        const allCodes = new Set<string>();
        let items: any[] = [];
        if (Array.isArray(data.items)) items = data.items;
        else if (typeof data.items === 'string') {
          try { items = JSON.parse(data.items); } catch { items = []; }
        }

        items.forEach((it) => {
          if (it.code) allCodes.add(String(it.code));
          else {
            const match = String(it.name || '').match(/\b\d{4}\b/);
            if (match) allCodes.add(match[0]);
          }
        });

        if (allCodes.size > 0) {
          Promise.all(
            Array.from(allCodes).map(async (code) => {
              try {
                const res = await fetch(`/api/stocks/quote?code=${code}`);
                if (res.ok) {
                  const d = await res.json();
                  if (d.closePrice) return { code, price: d.closePrice };
                }
              } catch {
                // ignore
              }
              return null;
            })
          ).then((results) => {
            const priceMap: Record<string, number> = {};
            results.forEach((r) => {
              if (r) priceMap[r.code] = r.price;
            });
            setLatestPrices(priceMap);
          });
        }
      }
      setLoading(false);
    }

    if (id) fetchFund();
  }, [id]);

  const handleFunnyClick = async () => {
    if (!fund || hasReacted) return;
    setHasReacted(true);
    try {
      const saved = localStorage.getItem('reacted_funds');
      const list = saved ? JSON.parse(saved) : [];
      localStorage.setItem('reacted_funds', JSON.stringify([...list, id]));
    } catch {
      // ignore
    }
    const newCount = (fund.funny_count || 0) + 1;
    setFund({ ...fund, funny_count: newCount });
    await supabase.from('funds').update({ funny_count: newCount }).eq('id', id);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fund?.title} | 俺ファンド`,
          url,
        });
        return;
      } catch {
        // ignore
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        ファンド情報を読み込み中...
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-600">
        <p className="font-bold">指定されたファンドが見つかりませんでした。</p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs">
          ホームに戻る
        </Link>
      </div>
    );
  }

  const perf = computeFundPerformance(fund, latestPrices);
  const weightTotal = perf.baseTotal > 0
    ? perf.baseTotal
    : perf.items.reduce((s, i) => s + (i.ratio || 1), 0) || 1;

  const displayItems = perf.items.map((item) => {
    const itemRatio = perf.baseTotal > 0
      ? Math.floor((item.baseAmt / perf.baseTotal) * 100)
      : item.ratio || Math.floor(100 / (perf.items.length || 1));
    return {
      ...item,
      displayRatio: itemRatio,
      weight: perf.baseTotal > 0 ? item.baseAmt : (item.ratio || 1),
    };
  });

  let currentAngle = 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left"
        >
          <span className="text-xl">📊</span>
          <span className="text-base font-black text-slate-900 tracking-tight">俺ファンド</span>
        </button>

        <div className="flex items-center gap-2">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScOBq_NVmGd5JBdc_KKNvTb6JI4wSBX7FRjhId5XIVzKZGHJw/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full transition flex items-center gap-1 shrink-0"
          >
            <span>📝</span>
            <span className="hidden sm:inline">アンケート</span>
          </a>

          <button
            type="button"
            onClick={() => router.push('/create')}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-full transition shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span>＋</span>
            <span>作成する</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {fund.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <Link
                href={`/?author=${encodeURIComponent(fund.author)}`}
                className="text-indigo-600 font-bold hover:underline"
              >
                @{fund.author}
              </Link>
              {fund.created_at && (
                <span>🕒 投稿日時: {formatCreatedAt(fund.created_at)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {perf.returnRate !== null && (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold">リターン（上昇率）</span>
                <span
                  className={`text-lg font-black ${
                    perf.returnRate >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {perf.returnRate >= 0 ? `+${perf.returnRate}` : perf.returnRate}%
                </span>
              </div>
            )}

            {perf.currentTotal !== undefined && (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold">現在の評価額</span>
                <span className="text-lg font-black text-indigo-700">
                  ¥{perf.currentTotal.toLocaleString()}
                </span>
              </div>
            )}

            {perf.baseTotal > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold">作成時の合計額</span>
                <span className="text-sm font-bold text-slate-600">
                  ¥{perf.baseTotal.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {fund.description && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              💬 {fund.description}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ポートフォリオ構成
            </div>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'bar' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 バー
              </button>
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'pie' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🍕 円グラフ
              </button>
            </div>
          </div>

          {chartType === 'bar' ? (
            <div className="space-y-3">
              <div className="h-10 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1 p-1 shadow-inner items-center">
                {displayItems.map((item, idx) => {
                  const isHovered = hoveredIdx === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{
                        flexGrow: item.weight,
                        backgroundColor: item.color,
                        minWidth: '20px',
                        transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)',
                        zIndex: isHovered ? 10 : 1,
                      }}
                      className="h-full first:rounded-l-full last:rounded-r-full shrink-0 flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer"
                    >
                      {item.displayRatio >= 8 && (
                        <span className="text-[11px] font-black text-white px-0.5 truncate select-none">
                          {item.displayRatio}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {displayItems.map((item, idx) => {
                    const sliceAngle = (item.weight / weightTotal) * 360;
                    const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + safeAngle;
                    currentAngle += safeAngle;

                    const isHovered = hoveredIdx === idx;
                    const outerR = isHovered ? 92 : 86;
                    const innerR = 48;

                    return (
                      <path
                        key={idx}
                        d={getDonutSlicePath(100, 100, outerR, innerR, startAngle, endAngle)}
                        fill={item.color}
                        className="transition-all duration-150 cursor-pointer"
                        style={{ opacity: hoveredIdx !== null && !isHovered ? 0.35 : 1 }}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    );
                  })}
                  <circle cx="100" cy="100" r="47" fill="transparent" onMouseEnter={() => setHoveredIdx(null)} />
                </svg>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`py-3 px-2 flex items-center justify-between rounded-xl transition ${
                  hoveredIdx === idx ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{item.name}</span>
                      {item.changeRate !== null && item.changeRate !== undefined && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                            item.changeRate >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {item.changeRate >= 0 ? `+${item.changeRate}%` : `${item.changeRate}%`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.basePrice !== undefined ? (
                        <span>
                          当時: ¥{item.basePrice.toLocaleString()}
                          {item.currentPrice && (
                            <span className="text-slate-800 font-bold"> → 今: ¥{item.currentPrice.toLocaleString()}</span>
                          )}
                          {item.shares && ` (${item.shares}株)`}
                        </span>
                      ) : item.baseAmt ? (
                        `¥${item.baseAmt.toLocaleString()}`
                      ) : (
                        '比率指定'
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900 shrink-0 pl-2">
                  {item.displayRatio}%
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleFunnyClick}
              disabled={hasReacted}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full transition cursor-pointer ${
                hasReacted
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100 active:scale-95'
              }`}
            >
              <span>{hasReacted ? '💡 納得済' : '💡 納得'}</span>
              <span>({fund.funny_count || 0})</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-full transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🔗</span>
              <span>{copied ? 'コピー完了！' : 'シェアする'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}