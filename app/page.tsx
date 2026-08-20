'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  price?: number;
  shares?: number;
  amount?: number;
  ratio?: number;
  color?: string;
};

type Fund = {
  id: string;
  title: string;
  author: string;
  funny_count: number;
  description: string;
  total_amount?: number;
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

export default function HomePage() {
  const router = useRouter();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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

  // 予算範囲フィルター処理（範囲の重複なし）
  const filteredFunds = funds.filter((fund) => {
    if (selectedBudget === 'all') return true;

    const rawItems = fund.items || [];
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
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h1 className="text-base font-black text-slate-900 tracking-tight">俺ファンド</h1>
        </div>
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
        {/* メインバナー */}
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

        {/* 予算フィルター & 表示形式（バー/円グラフ）切り替えタブ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>💰 予算で絞り込み</span>
            {/* グラフ形式切り替えタブ */}
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
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ファンド一覧リスト */}
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
            {filteredFunds.map((fund) => {
              const rawItems = fund.items || [];
              const formattedItems = rawItems.map((item, idx) => {
                const name = (item.name || `銘柄${idx + 1}`).trim();
                const p = Number(item.price) || 0;
                const s = Number(item.shares) || 0;
                const amount = item.amount ? Number(item.amount) : Math.floor(p * s);
                return {
                  name,
                  amount,
                  ratio: item.ratio ? Number(item.ratio) : 0,
                  color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                };
              });

              const totalAmt = fund.total_amount
                ? Number(fund.total_amount)
                : formattedItems.reduce((s, i) => s + i.amount, 0);

              const isHovered = hoveredCardId === fund.id;
              let currentAngle = 0;

              return (
                <div
                  key={fund.id}
                  onClick={() => router.push(`/fund/${fund.id}`)}
                  onMouseEnter={() => setHoveredCardId(fund.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className={`bg-white rounded-3xl p-5 border transition-all duration-300 cursor-pointer space-y-4 ${
                    isHovered
                      ? 'border-indigo-300 shadow-xl -translate-y-1 scale-[1.01]'
                      : 'border-slate-200/70 shadow-xs hover:border-indigo-200 hover:shadow-md'
                  }`}
                >
                  {/* カード上部: タイトル・投稿者・設定金額 */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 flex-grow min-w-0">
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

                  {/* こだわり説明文 */}
                  {fund.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      💬 {fund.description}
                    </p>
                  )}

                  {/* グラフ描画エリア */}
                  {chartType === 'bar' ? (
                    /* 1本スタックバー（パーセンテージ付き & ポコッと浮き出る演出） */
                    <div className="space-y-2.5 pt-1">
                      <div className="h-8 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 shadow-inner items-center">
                        {formattedItems.map((item, idx) => {
                          const pct = totalAmt > 0
                            ? Math.floor((item.amount / totalAmt) * 100)
                            : item.ratio || Math.floor(100 / (formattedItems.length || 1));

                          if (pct <= 0) return null;

                          return (
                            <div
                              key={idx}
                              style={{
                                flexGrow: Math.max(pct, 2),
                                backgroundColor: item.color,
                                minWidth: '16px',
                                transform: isHovered ? 'scaleY(1.08)' : 'scaleY(1)',
                              }}
                              className="h-full first:rounded-l-full last:rounded-r-full shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-200"
                              title={`${item.name}: ${pct}%`}
                            >
                              {pct >= 8 && (
                                <span className="text-[10px] font-black text-white drop-shadow-2xs select-none px-0.5 truncate">
                                  {pct}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 銘柄バッジ一覧 */}
                      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 items-center pt-0.5">
                        {formattedItems.map((item, idx) => {
                          const pct = totalAmt > 0
                            ? Math.floor((item.amount / totalAmt) * 100)
                            : item.ratio || Math.floor(100 / (formattedItems.length || 1));

                          return (
                            <div key={idx} className="flex items-center gap-1.5 text-xs">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-slate-700 font-bold truncate max-w-[130px]">
                                {item.name}
                              </span>
                              <span className="font-black text-slate-900 text-[11px]">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* 円グラフ表示（ドーナツチャート） */
                    <div className="flex items-center justify-between gap-4 pt-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          {formattedItems.map((item, idx) => {
                            const pct = totalAmt > 0
                              ? Math.floor((item.amount / totalAmt) * 100)
                              : item.ratio || Math.floor(100 / (formattedItems.length || 1));

                            if (pct <= 0) return null;

                            const sliceAngle = (pct / 100) * 360;
                            const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + safeAngle;
                            currentAngle += safeAngle;

                            return (
                              <path
                                key={idx}
                                d={getDonutSlicePath(100, 100, 90, 52, startAngle, endAngle)}
                                fill={item.color}
                                className="transition-all duration-200"
                              />
                            );
                          })}
                        </svg>
                      </div>

                      {/* 右側の銘柄リスト */}
                      <div className="flex flex-col gap-1.5 flex-grow min-w-0">
                        {formattedItems.map((item, idx) => {
                          const pct = totalAmt > 0
                            ? Math.floor((item.amount / totalAmt) * 100)
                            : item.ratio || Math.floor(100 / (formattedItems.length || 1));

                          return (
                            <div key={idx} className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-slate-700 font-bold truncate">
                                  {item.name}
                                </span>
                              </div>
                              <span className="font-black text-slate-900 text-xs shrink-0">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* スクロール追従: 大きくて押しやすい「ファンドを作成する」ボタン */}
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