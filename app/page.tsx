'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  price?: number | string;
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

function FundCard({
  fund,
  chartType,
  onClick,
}: {
  fund: Fund;
  chartType: 'bar' | 'pie';
  onClick: () => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  let rawItems: any[] = [];
  if (Array.isArray(fund.items)) {
    rawItems = fund.items;
  } else if (typeof fund.items === 'string') {
    try {
      rawItems = JSON.parse(fund.items);
    } catch {
      rawItems = [];
    }
  }

  const formattedItems = rawItems.map((item, idx) => {
    const name = (item.name || `銘柄${idx + 1}`).trim();
    const price = item.price !== undefined && item.price !== null && item.price !== '' ? Number(item.price) : undefined;
    const shares = item.shares !== undefined && item.shares !== null && item.shares !== '' ? Number(item.shares) : undefined;
    let amount = item.amount !== undefined && item.amount !== null && item.amount !== '' ? Math.floor(Number(item.amount)) : 0;
    if (!amount && price !== undefined && shares !== undefined) {
      amount = Math.floor(price * shares);
    }
    return {
      name,
      price,
      shares,
      amount,
      ratio: item.ratio ? Number(item.ratio) : 0,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    };
  });

  const totalAmt = fund.total_amount
    ? Math.floor(Number(fund.total_amount))
    : formattedItems.reduce((s, i) => s + i.amount, 0);

  const weightTotal = totalAmt > 0
    ? totalAmt
    : formattedItems.reduce((s, i) => s + (i.ratio || 1), 0) || 1;

  const displayItems = formattedItems.map((item) => {
    const itemRatio = totalAmt > 0
      ? Math.floor((item.amount / totalAmt) * 100)
      : item.ratio || Math.floor(100 / (formattedItems.length || 1));
    return {
      ...item,
      displayRatio: itemRatio,
      weight: totalAmt > 0 ? item.amount : (item.ratio || 1),
    };
  });

  let currentAngle = 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-200 cursor-pointer space-y-4"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-0.5 flex-grow min-w-0">
          <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate">
            {fund.title}
          </h4>
          <p className="text-xs text-slate-400 font-medium">@{fund.author}</p>
        </div>
        {totalAmt > 0 && (
          <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl shrink-0 border border-indigo-100 shadow-2xs">
            ¥{totalAmt.toLocaleString()}
          </span>
        )}
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

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
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
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {item.price !== undefined && item.shares !== undefined ? (
                          `¥${item.price.toLocaleString()} × ${item.shares}株`
                        ) : item.amount ? (
                          `¥${item.amount.toLocaleString()}`
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

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
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
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {item.price !== undefined && item.shares !== undefined ? (
                          `¥${item.price.toLocaleString()} × ${item.shares}株`
                        ) : item.amount ? (
                          `¥${item.amount.toLocaleString()}`
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
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    async function fetchFunds() {
      setLoading(true);
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFunds(data);
      }
      setLoading(false);
    }
    fetchFunds();
  }, []);

  const handleResetToHome = () => {
    setSelectedBudget('all');
    router.push('/');
  };

  const filteredFunds = funds.filter((fund) => {
    if (selectedBudget === 'all') return true;

    let rawItems: any[] = [];
    if (Array.isArray(fund.items)) {
      rawItems = fund.items;
    } else if (typeof fund.items === 'string') {
      try {
        rawItems = JSON.parse(fund.items);
      } catch {
        rawItems = [];
      }
    }

    const calculatedTotal = rawItems.reduce((sum, item) => {
      const p = Number(item.price) || 0;
      const s = Number(item.shares) || 0;
      return sum + (item.amount ? Number(item.amount) : Math.floor(p * s));
    }, 0);

    const totalAmt = fund.total_amount ? Number(fund.total_amount) : calculatedTotal;
    const currentFilter = BUDGET_FILTERS.find((f) => f.label === selectedBudget);
    if (!currentFilter) return true;

    if (currentFilter.min !== undefined && currentFilter.max !== undefined) {
      return totalAmt >= currentFilter.min && totalAmt <= currentFilter.max;
    }
    if (currentFilter.min !== undefined && currentFilter.max === undefined) {
      return totalAmt >= currentFilter.min;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 relative">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={handleResetToHome}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left"
        >
          <span className="text-xl">📊</span>
          <h1 className="text-base font-black text-slate-900 tracking-tight">俺ファンド</h1>
        </button>
        <button
          type="button"
          onClick={() => router.push('/create')}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-full transition shadow-xs cursor-pointer flex items-center gap-1"
        >
          <span>＋</span>
          <span>ファンドを作成する</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-5">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 text-white shadow-md space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
              仮想ポートフォリオ
            </span>
          </div>
          <h2 className="text-lg font-black leading-snug">理想のファンドを組み立ててシェアしよう📈</h2>
          <p className="text-xs text-indigo-100 leading-relaxed">
            気になる銘柄・推し企業を組み合わせてオリジナル投資信託を作成。みんなのポートフォリオを見てアレンジもできます。
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>💰 予算で絞り込み</span>
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 1本バー
              </button>
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  chartType === 'pie'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🍕 円グラフ
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
            {BUDGET_FILTERS.map((filter) => {
              const isSelected = (filter.value === 'all' && selectedBudget === 'all') || selectedBudget === filter.label;
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => setSelectedBudget(filter.value === 'all' ? 'all' : filter.label)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-102'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">ファンドを読み込み中...</div>
        ) : filteredFunds.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3 shadow-xs">
            <div className="text-3xl">🔍</div>
            <p className="text-sm font-bold text-slate-700">条件に合うファンドが見つかりませんでした</p>
            <p className="text-xs text-slate-400">自分で新しいファンドを作成してみませんか？</p>
            <button
              type="button"
              onClick={() => router.push('/create')}
              className="text-xs bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-full hover:bg-indigo-700 transition cursor-pointer"
            >
              ファンドを作成する 🚀
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFunds.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                chartType={chartType}
                onClick={() => router.push(`/fund/${fund.id}`)}
              />
            ))}
          </div>
        )}
      </main>

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