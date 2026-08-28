'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

const BUDGET_FILTERS = [
  { label: 'すべて', value: 'all' },
  { label: '〜5万円', min: 1, max: 50000 },
  { label: '5万〜10万円', min: 50001, max: 100000 },
  { label: '10万〜15万円', min: 100001, max: 150000 },
  { label: '15万〜20万円', min: 150001, max: 200000 },
  { label: '20万円以上', min: 200001 },
];

type SortMode = 'latest' | 'return_desc';

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

function FundCard({
  fund,
  chartType,
  hasReacted,
  latestPrices,
  onFunnyClick,
  onAuthorClick,
  onClick,
}: {
  fund: Fund;
  chartType: 'bar' | 'pie';
  hasReacted: boolean;
  latestPrices: Record<string, number>;
  onFunnyClick: (fundId: string, currentCount: number) => void;
  onAuthorClick: (author: string) => void;
  onClick: () => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
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
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-2xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer space-y-4 relative"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-0.5 flex-grow min-w-0">
          <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate group-hover:text-indigo-600 transition-colors">
            {fund.title}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAuthorClick(fund.author);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold transition cursor-pointer"
              title={`${fund.author}さんのファンドを絞り込み`}
            >
              @{fund.author}
            </button>
            {fund.created_at && (
              <span className="text-[10px] text-slate-400 font-medium">
                🕒 {formatCreatedAt(fund.created_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            {perf.returnRate !== null && (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-xl border flex items-center gap-0.5 shadow-2xs ${
                  perf.returnRate >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span>{perf.returnRate >= 0 ? '▲' : '▼'}</span>
                <span>{perf.returnRate >= 0 ? `+${perf.returnRate}` : perf.returnRate}%</span>
              </span>
            )}

            {perf.currentTotal !== undefined ? (
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100 shadow-2xs">
                現在: ¥{perf.currentTotal.toLocaleString()}
              </span>
            ) : perf.baseTotal > 0 ? (
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl border border-indigo-100 shadow-2xs">
                ¥{perf.baseTotal.toLocaleString()}
              </span>
            ) : null}
          </div>

          {perf.currentTotal !== undefined && perf.baseTotal > 0 && (
            <span className="text-[10px] text-slate-400 font-medium">
              当時合計: ¥{perf.baseTotal.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {fund.description && (
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
          💬 {fund.description}
        </p>
      )}

      {chartType === 'bar' ? (
        <div className="space-y-3 pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="h-9 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1 p-1 shadow-inner items-center">
            {displayItems.map((item, idx) => {
              const widthPercent = (item.weight / weightTotal) * 100;
              if (widthPercent <= 0) return null;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    flexGrow: item.weight,
                    backgroundColor: item.color,
                    minWidth: '18px',
                    transform: isHovered ? 'scaleY(1.22)' : 'scaleY(1)',
                    boxShadow: isHovered ? `0 0 12px ${item.color}` : 'none',
                    filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
                    zIndex: isHovered ? 10 : 1,
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full shrink-0 flex items-center justify-center overflow-hidden transition-all duration-200 cursor-pointer"
                  title={`${item.name}: ${item.displayRatio}%`}
                >
                  {item.displayRatio >= 8 && (
                    <span className="text-[10px] font-black text-white drop-shadow-2xs select-none px-0.5 truncate">
                      {item.displayRatio}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="h-7 flex items-center justify-center">
            {hoveredIdx !== null && displayItems[hoveredIdx] ? (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 text-xs shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: displayItems[hoveredIdx].color }}
                />
                <span className="font-bold text-slate-800">
                  {displayItems[hoveredIdx].name}
                </span>
                <span className="font-black text-indigo-600">
                  {displayItems[hoveredIdx].displayRatio}%
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">バーに触れると詳細が表示されます</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            {displayItems.map((item, idx) => {
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-indigo-50/80 border-indigo-200 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.name}
                        </span>
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
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
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
                  <span className="font-black text-xs text-slate-900 shrink-0 pl-1">
                    {item.displayRatio}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center justify-center pt-2 pb-2 px-2 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div className="relative w-60 h-60 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {displayItems.map((item, idx) => {
                  if (item.weight <= 0) return null;

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
                      style={{
                        opacity: hoveredIdx !== null && !isHovered ? 0.35 : 1,
                      }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}
                <circle
                  cx="100"
                  cy="100"
                  r="47"
                  fill="transparent"
                  className="cursor-default"
                  onMouseEnter={() => setHoveredIdx(null)}
                />
              </svg>
            </div>

            <div className="h-7 mt-1 flex items-center justify-center">
              {hoveredIdx !== null && displayItems[hoveredIdx] ? (
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-full border border-slate-200 text-xs shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: displayItems[hoveredIdx].color }}
                  />
                  <span className="font-bold text-slate-800">
                    {displayItems[hoveredIdx].name}
                  </span>
                  <span className="font-black text-indigo-600">
                    {displayItems[hoveredIdx].displayRatio}%
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">グラフに触れると詳細が表示されます</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            {displayItems.map((item, idx) => {
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-indigo-50/80 border-indigo-200 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.name}
                        </span>
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
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
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
                  <span className="font-black text-xs text-slate-900 shrink-0 pl-1">
                    {item.displayRatio}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-start items-center border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onFunnyClick(fund.id, fund.funny_count || 0)}
          disabled={hasReacted}
          className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer ${
            hasReacted
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 active:scale-95'
          }`}
        >
          <span>{hasReacted ? '💡 納得済' : '💡 納得'}</span>
        </button>
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAuthor = searchParams.get('author') || '';

  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [reactedFunds, setReactedFunds] = useState<string[]>([]);
  const [latestPrices, setLatestPrices] = useState<Record<string, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialAuthor) setSearchQuery(initialAuthor);
  }, [initialAuthor]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reacted_funds');
      if (saved) setReactedFunds(JSON.parse(saved));
    } catch {
      // ignore
    }

    async function fetchFunds() {
      setLoading(true);
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFunds(data);

        const allCodes = new Set<string>();
        data.forEach((f) => {
          let items: any[] = [];
          if (Array.isArray(f.items)) items = f.items;
          else if (typeof f.items === 'string') {
            try { items = JSON.parse(f.items); } catch { items = []; }
          }
          items.forEach((it) => {
            if (it.code) allCodes.add(String(it.code));
            else {
              const match = String(it.name || '').match(/\b\d{4}\b/);
              if (match) allCodes.add(match[0]);
            }
          });
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
    fetchFunds();
  }, []);

  const handleFunnyClick = async (fundId: string, currentCount: number) => {
    if (reactedFunds.includes(fundId)) return;
    const nextReacted = [...reactedFunds, fundId];
    setReactedFunds(nextReacted);
    try {
      localStorage.setItem('reacted_funds', JSON.stringify(nextReacted));
    } catch {
      // ignore
    }
    const newCount = currentCount + 1;
    setFunds((prev) =>
      prev.map((f) => (f.id === fundId ? { ...f, funny_count: newCount } : f))
    );
    await supabase.from('funds').update({ funny_count: newCount }).eq('id', fundId);
  };

  const handleResetToHome = () => {
    setSelectedBudget('all');
    setSearchQuery('');
    setSortMode('latest');
    router.push('/');
  };

  const returnRanking = [...funds]
    .map((f) => ({
      fund: f,
      perf: computeFundPerformance(f, latestPrices),
    }))
    .filter((x) => x.perf.returnRate !== null)
    .sort((a, b) => (b.perf.returnRate || 0) - (a.perf.returnRate || 0))
    .slice(0, 5);

  const filteredFunds = funds
    .filter((fund) => {
      let rawItems: any[] = [];
      if (Array.isArray(fund.items)) rawItems = fund.items;
      else if (typeof fund.items === 'string') {
        try { rawItems = JSON.parse(fund.items); } catch { rawItems = []; }
      }

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchTitle = (fund.title || '').toLowerCase().includes(q);
        const matchAuthor = (fund.author || '').toLowerCase().includes(q);
        const matchDesc = (fund.description || '').toLowerCase().includes(q);
        const matchItems = rawItems.some((item) => (item.name || '').toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchDesc && !matchItems) return false;
      }

      if (selectedBudget === 'all') return true;
      const perf = computeFundPerformance(fund, latestPrices);
      const currentFilter = BUDGET_FILTERS.find((f) => f.label === selectedBudget);
      if (!currentFilter) return true;

      if (currentFilter.min !== undefined && currentFilter.max !== undefined) {
        return perf.baseTotal >= currentFilter.min && perf.baseTotal <= currentFilter.max;
      }
      if (currentFilter.min !== undefined && currentFilter.max === undefined) {
        return perf.baseTotal >= currentFilter.min;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'return_desc') {
        const perfA = computeFundPerformance(a, latestPrices).returnRate ?? -9999;
        const perfB = computeFundPerformance(b, latestPrices).returnRate ?? -9999;
        return perfB - perfA;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 relative">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
            title="ランキングとフィルターを開く"
          >
            <span>👑</span>
            <span className="hidden sm:inline">上昇率 & 絞り込み</span>
            <span className="sm:hidden">絞り込み</span>
          </button>

          <button
            type="button"
            onClick={handleResetToHome}
            className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer text-left whitespace-nowrap shrink-0"
          >
            <span className="text-xl">📊</span>
            <h1 className="text-base font-black text-slate-900 tracking-tight whitespace-nowrap">俺ファンド</h1>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 📝 お客様アンケート */}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScOBq_NVmGd5JBdc_KKNvTb6JI4wSBX7FRjhId5XIVzKZGHJw/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-full transition flex items-center gap-1 shrink-0"
            title="ご意見・アンケート"
          >
            <span>📝</span>
            <span className="hidden sm:inline">アンケート</span>
          </a>

          <button
            type="button"
            onClick={() => router.push('/create')}
            className="hidden sm:flex text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-full transition shadow-xs cursor-pointer items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>＋</span>
            <span>ファンドを作成する</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左側：サイドバー */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-80 bg-white p-5 shadow-2xl border-r border-slate-200 overflow-y-auto transition-transform duration-300 ease-out lg:static lg:block lg:w-auto lg:p-0 lg:shadow-none lg:border-none lg:z-auto lg:col-span-4 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 lg:hidden">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <span>👑</span>
              <span>上昇率 & 絞り込み</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
            >
              ✕ 閉じる
            </button>
          </div>

          <div className="space-y-6">
            {/* 上昇率ランキング */}
            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>👑</span>
                  <span>上昇率 TOP5</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">作成時比較</span>
              </div>

              {returnRanking.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">計算中またはデータなし</p>
              ) : (
                <div className="space-y-2">
                  {returnRanking.map((item, idx) => (
                    <div
                      key={item.fund.id}
                      onClick={() => {
                        setIsSidebarOpen(false);
                        router.push(`/fund/${item.fund.id}`);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/70 rounded-2xl border border-slate-100 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-slate-900 shadow-2xs' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-600/60 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {item.fund.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">@{item.fund.author}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        +{item.perf.returnRate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 予算別フィルター */}
            <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <span>💰</span>
                <span>価格帯で絞り込み</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {BUDGET_FILTERS.map((filter) => {
                  const isSelected = (filter.value === 'all' && selectedBudget === 'all') || selectedBudget === filter.label;
                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => {
                        setSelectedBudget(filter.value === 'all' ? 'all' : filter.label);
                        setIsSidebarOpen(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 📝 お客様アンケート */}
            <div className="bg-indigo-50/60 rounded-3xl p-4 border border-indigo-100 space-y-2">
              <h3 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <span>📝</span>
                <span>ご意見・ご要望</span>
              </h3>
              <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                サービス向上のため、アンケートへのご協力をお願いいたします！
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLScOBq_NVmGd5JBdc_KKNvTb6JI4wSBX7FRjhId5XIVzKZGHJw/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs text-center"
              >
                アンケートに回答する ↗
              </a>
            </div>
          </div>
        </aside>

        {/* ドロワーの背景マスク */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-2xs lg:hidden animate-in fade-in duration-200"
          />
        )}

        {/* メインタイムライン */}
        <main className="lg:col-span-8 space-y-5">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 text-white shadow-md space-y-2">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
              仮想ポートフォリオ
            </span>
            <h2 className="text-lg font-black leading-snug">理想のファンドを組み立ててシェアしよう📈</h2>
            <p className="text-xs text-indigo-100 leading-relaxed">
              気になる銘柄・推し企業を組み合わせてオリジナル投資信託を作成。みんなのポートフォリオを見てアレンジもできます。
            </p>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ファンド名、作成者名、銘柄名でリアルタイム検索..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* ソート ＆ グラフ切り替えタブ */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setSortMode('latest')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sortMode === 'latest' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🕒 新着順
              </button>
              <button
                type="button"
                onClick={() => setSortMode('return_desc')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sortMode === 'return_desc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📈 リターン順
              </button>
            </div>

            <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'bar' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 1本バー
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

          {/* ファンド一覧 */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">ファンドを読み込み中...</div>
          ) : filteredFunds.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3 shadow-xs">
              <div className="text-3xl">🔍</div>
              <p className="text-sm font-bold text-slate-700">条件に一致するファンドが見つかりませんでした</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-indigo-600 font-bold hover:underline block mx-auto cursor-pointer"
                >
                  検索ワードをクリアする
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFunds.map((fund) => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  chartType={chartType}
                  hasReacted={reactedFunds.includes(fund.id)}
                  latestPrices={latestPrices}
                  onFunnyClick={handleFunnyClick}
                  onAuthorClick={(auth) => setSearchQuery(auth)}
                  onClick={() => router.push(`/fund/${fund.id}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <button
        type="button"
        onClick={() => router.push('/create')}
        className="fixed bottom-6 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black px-5 py-4 rounded-full shadow-2xl transition-all duration-200 flex items-center gap-2.5 text-sm cursor-pointer border-2 border-white/30 hover:shadow-indigo-500/30"
        title="新しいファンドを作成する"
      >
        <span className="text-lg leading-none">＋</span>
        <span>ファンドを作成する</span>
      </button>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">読み込み中...</div>}>
      <HomeContent />
    </Suspense>
  );
}