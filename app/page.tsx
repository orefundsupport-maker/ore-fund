'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  ratio?: number;
  amount?: number;
  price?: number;
  shares?: number;
  color?: string;
};

type Fund = {
  id: string;
  title: string;
  author: string;
  funny_count: number;
  description: string;
  total_amount?: number;
  created_at?: string;
  items: FundItem[];
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

const SAMPLE_FUNDS: Fund[] = [
  {
    id: '1',
    title: '大谷CM採用企業ポートフォリオ',
    author: '大谷ファン ◆abc12345',
    funny_count: 0,
    created_at: '2026-08-11T09:00:00.000Z',
    description: '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！彼の世界的な活躍とともに企業価値も爆上がりすることを期待しています。',
    total_amount: 1000000,
    items: [
      { name: 'コーセー', price: 10000, shares: 30, amount: 300000, ratio: 30, color: '#3B82F6' },
      { name: '伊藤園', price: 3000, shares: 100, amount: 300000, ratio: 30, color: '#10B981' },
      { name: 'セイコーグループ', price: 4000, shares: 50, amount: 200000, ratio: 20, color: '#F59E0B' },
      { name: '西川', price: 2000, shares: 100, amount: 200000, ratio: 20, color: '#EC4899' },
    ],
  },
  {
    id: '2',
    title: '深夜のラーメン＆サウナ欲望全振ファンド',
    author: 'ととのい太郎',
    funny_count: 0,
    created_at: '2026-08-10T22:30:00.000Z',
    description: '自分の大好きな「深夜ラーメン」と「週末サウナ」を提供している企業に全集中投資。難しい分析は不要、パッションと愛だけで勝負！',
    total_amount: 500000,
    items: [
      { name: 'ギフトHD（町田商店）', price: 2500, shares: 100, amount: 250000, ratio: 50, color: '#EF4444' },
      { name: '極楽湯HD', price: 500, shares: 300, amount: 150000, ratio: 30, color: '#8B5CF6' },
      { name: '現金（待機資金）', price: 100000, shares: 1, amount: 100000, ratio: 20, color: '#6B7280' },
    ],
  },
  {
    id: '3',
    title: 'オルカン一括＆暗号資産スパイス',
    author: '堅実チャレンジャー ◆xyz98765',
    funny_count: 0,
    created_at: '2026-08-10T15:00:00.000Z',
    description: '王道の「eMAXIS Slim 全世界株式」で超堅実に土台を固めつつ、爆発力のあるビットコインを15%だけスパイスとして投入したハイブリッド構成。',
    total_amount: 1000000,
    items: [
      { name: '全世界株式（オルカン）', price: 20000, shares: 42.5, amount: 850000, ratio: 85, color: '#2563EB' },
      { name: '暗号資産（BTC/ETH）', price: 150000, shares: 1, amount: 150000, ratio: 15, color: '#F97316' },
    ],
  },
];

type AmountBandKey = 'all' | 'under5' | 'under10' | 'under15' | 'under20' | 'over20';

const AMOUNT_BANDS: { key: AmountBandKey; label: string; min: number; max?: number }[] = [
  { key: 'all', label: 'すべて', min: 0 },
  { key: 'under5', label: '〜5万円', min: 0, max: 50000 },
  { key: 'under10', label: '〜10万円', min: 50001, max: 100000 },
  { key: 'under15', label: '〜15万円', min: 100001, max: 150000 },
  { key: 'under20', label: '〜20万円', min: 150001, max: 200000 },
  { key: 'over20', label: '20万円〜', min: 200001 },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function getDonutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngleDeg: number,
  endAngleDeg: number
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

export default function Home() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [reactedFunds, setReactedFunds] = useState<string[]>([]);
  const [amountFilter, setAmountFilter] = useState<AmountBandKey>('all');

  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>({});
  const [hoveredItems, setHoveredItems] = useState<Record<string, (FundItem & { ratio: number; displayAmount: number }) | null>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reacted_funds');
      if (saved) {
        setReactedFunds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    async function fetchFunds() {
      setLoading(true);
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setFunds(SAMPLE_FUNDS);
      } else {
        const existingIds = new Set(data.map((f) => f.id));
        const missingSamples = SAMPLE_FUNDS.filter((s) => !existingIds.has(s.id));
        setFunds([...data, ...missingSamples]);
      }
      setLoading(false);
    }

    fetchFunds();
  }, []);

  const handleFunnyClick = async (id: string, currentCount: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (reactedFunds.includes(id)) return;

    const nextReacted = [...reactedFunds, id];
    setReactedFunds(nextReacted);
    try {
      localStorage.setItem('reacted_funds', JSON.stringify(nextReacted));
    } catch {
      // ignore
    }

    setFunds((prevFunds) =>
      prevFunds.map((fund) =>
        fund.id === id ? { ...fund, funny_count: (fund.funny_count || 0) + 1 } : fund
      )
    );

    const { error } = await supabase
      .from('funds')
      .update({ funny_count: currentCount + 1 })
      .eq('id', id);

    if (error) {
      console.error('更新エラー:', error);
    }
  };

  const toggleChartType = (fundId: string, type: 'pie' | 'bar', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChartTypes((prev) => ({ ...prev, [fundId]: type }));
  };

  const handleAuthorClick = (authorName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchQuery(authorName);
  };

  const getFundTotalAmount = (fund: Fund): number => {
    if (fund.total_amount) return Math.floor(Number(fund.total_amount));
    return Math.floor(
      (fund.items || []).reduce((sum, item) => {
        const amount = item.amount ?? ((item.price || 0) * (item.shares || 0));
        return sum + (amount || 0);
      }, 0)
    );
  };

  const filteredFunds = funds.filter((fund) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchTitle = fund.title?.toLowerCase().includes(query);
      const matchDescription = fund.description?.toLowerCase().includes(query);
      const matchAuthor = fund.author?.toLowerCase().includes(query);
      const matchItems = fund.items?.some((item) =>
        item.name?.toLowerCase().includes(query)
      );
      if (!matchTitle && !matchDescription && !matchAuthor && !matchItems) return false;
    }

    if (amountFilter !== 'all') {
      const band = AMOUNT_BANDS.find((b) => b.key === amountFilter)!;
      const total = getFundTotalAmount(fund);
      if (total < band.min) return false;
      if (band.max !== undefined && total > band.max) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-indigo-600 hover:opacity-80 transition cursor-pointer"
          title="トップページへ戻る"
        >
          俺ファンド
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-6">
        <section className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 キーワード、銘柄、ユーザー名（@〜）で検索..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs text-indigo-700 font-medium">
              <span>「<strong>{searchQuery}</strong>」で検索中</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-indigo-500 underline hover:text-indigo-800 ml-2 cursor-pointer"
              >
                クリア
              </button>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {AMOUNT_BANDS.map((band) => (
              <button
                type="button"
                key={band.key}
                onClick={() => setAmountFilter(band.key)}
                className={`flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border transition cursor-pointer ${
                  amountFilter === band.key
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {band.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex justify-center pt-1">
          <Link
            href="/create"
            className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-base active:scale-98"
          >
            <span className="text-lg">➕</span>
            <span>自分で作る</span>
          </Link>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            💡 注目ファンド一覧
          </h2>

          {loading ? (
            <p className="text-center text-slate-400 py-8 text-sm">読み込み中...</p>
          ) : filteredFunds.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">
              条件に合うファンドが見つかりませんでした。
            </p>
          ) : (
            filteredFunds.map((fund) => {
              const currentChart = chartTypes[fund.id] || 'pie';
              const activeHoveredItem = hoveredItems[fund.id] || null;
              const hasReacted = reactedFunds.includes(fund.id);

              const itemsList = fund.items || [];

              const formattedItems = itemsList.map((item, idx) => {
                const name = (item.name || `銘柄${idx + 1}`).trim();
                const price = item.price ? Number(item.price) : undefined;
                const shares = item.shares ? Number(item.shares) : undefined;
                let amount = item.amount ? Math.floor(Number(item.amount)) : 0;
                if (!amount && price !== undefined && shares !== undefined) {
                  amount = Math.floor(price * shares);
                }
                return {
                  name,
                  price,
                  shares,
                  amount,
                  ratio: item.ratio ? Math.floor(Number(item.ratio)) : 0,
                  color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                };
              });

              const totalAmount = fund.total_amount
                ? Math.floor(Number(fund.total_amount))
                : Math.floor(formattedItems.reduce((s, i) => s + (i.amount || 0), 0));

              const weightTotal = totalAmount > 0
                ? totalAmount
                : formattedItems.reduce((s, i) => s + (i.ratio || 1), 0) || 1;

              const displayItems = formattedItems.map((item) => {
                const itemRatio = totalAmount > 0
                  ? Math.floor((item.amount / totalAmount) * 100)
                  : item.ratio;
                return {
                  ...item,
                  displayRatio: itemRatio,
                  weight: totalAmount > 0 ? item.amount : (item.ratio || 1),
                };
              });

              let currentAngle = 0;
              const formattedCreatedDate = formatDate(fund.created_at);

              return (
                <Link
                  key={fund.id}
                  href={`/fund/${fund.id}`}
                  className="block bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition active:scale-98"
                >
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleAuthorClick(fund.author || '匿名', e)}
                        className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1 transition cursor-pointer"
                        title="このユーザーの投稿一覧を見る"
                      >
                        <span>@{fund.author || '匿名'}</span>
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">投稿一覧 🔍</span>
                      </button>

                      {formattedCreatedDate && (
                        <span className="text-[11px] text-slate-400">
                          ・ {formattedCreatedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{fund.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{fund.description}</p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        ポートフォリオ構成
                      </span>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={(e) => toggleChartType(fund.id, 'pie', e)}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                            currentChart === 'pie'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          🍕 円グラフ
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleChartType(fund.id, 'bar', e)}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                            currentChart === 'bar'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          📊 バー
                        </button>
                      </div>
                    </div>

                    {currentChart === 'pie' ? (
                      <div className="flex flex-col items-center justify-center pt-2 pb-3 px-2 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="relative w-80 h-80 flex items-center justify-center">
                          <svg viewBox="0 0 200 200" className="w-full h-full">
                            {displayItems.map((item, idx) => {
                              if (item.weight <= 0) return null;

                              const sliceAngle = (item.weight / weightTotal) * 360;
                              const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;

                              const startAngle = currentAngle;
                              const endAngle = currentAngle + safeAngle;
                              currentAngle += safeAngle;

                              const isHovered = activeHoveredItem?.name === item.name;
                              const outerR = isHovered ? 92 : 86;
                              const innerR = 48;

                              const pathData = getDonutSlicePath(100, 100, outerR, innerR, startAngle, endAngle);

                              return (
                                <path
                                  key={idx}
                                  d={pathData}
                                  fill={item.color}
                                  className="transition-all duration-200 cursor-pointer"
                                  style={{
                                    opacity: activeHoveredItem && !isHovered ? 0.35 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoveredItems((prev) => ({
                                      ...prev,
                                      [fund.id]: { ...item, ratio: item.displayRatio, displayAmount: item.amount },
                                    }));
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    setHoveredItems((prev) => ({ ...prev, [fund.id]: null }));
                                  }}
                                />
                              );
                            })}

                            <circle
                              cx="100"
                              cy="100"
                              r="47"
                              fill="transparent"
                              className="cursor-default"
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoveredItems((prev) => ({ ...prev, [fund.id]: null }));
                              }}
                            />
                          </svg>
                        </div>

                        <div className="h-9 mt-1 flex items-center justify-center">
                          {activeHoveredItem ? (
                            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: activeHoveredItem.color }}
                              />
                              <span className="font-bold text-slate-800">
                                {activeHoveredItem.name}
                              </span>
                              {activeHoveredItem.price && activeHoveredItem.shares && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  (¥{activeHoveredItem.price.toLocaleString()} × {activeHoveredItem.shares}株)
                                </span>
                              )}
                              <span
                                className="font-black px-2 py-0.5 rounded-md text-white"
                                style={{ backgroundColor: activeHoveredItem.color }}
                              >
                                {activeHoveredItem.ratio}%
                              </span>
                            </div>
                          ) : (
                            totalAmount > 0 && (
                              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-100">
                                合計設定額: ¥{totalAmount.toLocaleString()}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 shadow-inner my-2">
                        {displayItems.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ width: `${(item.weight / weightTotal) * 100}%`, backgroundColor: item.color }}
                            title={`${item.name}: ${item.displayRatio}%`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 text-xs text-slate-600 pt-1">
                      {displayItems.map((item, idx) => {
                        const isHovered = activeHoveredItem?.name === item.name;
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() =>
                              setHoveredItems((prev) => ({
                                ...prev,
                                [fund.id]: { ...item, ratio: item.displayRatio, displayAmount: item.amount },
                              }))
                            }
                            onMouseLeave={() =>
                              setHoveredItems((prev) => ({ ...prev, [fund.id]: null }))
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              isHovered
                                ? 'bg-indigo-50 border-indigo-200 shadow-xs scale-105'
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className={`font-medium ${isHovered ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                              {item.name}
                            </span>
                            {item.price && item.shares && (
                              <span className="text-[10px] text-slate-400">
                                (¥{item.price.toLocaleString()}×{item.shares})
                              </span>
                            )}
                            <span className="font-bold text-slate-800">
                              {item.displayRatio}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={(e) => handleFunnyClick(fund.id, fund.funny_count, e)}
                      disabled={hasReacted}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer ${
                        hasReacted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100 active:scale-95'
                      }`}
                    >
                      <span>{hasReacted ? '💡 納得済' : '💡 納得'}</span>
                      <span>{fund.funny_count || 0}</span>
                    </button>
                    <span className="text-xs text-indigo-600 font-semibold">詳細を見る →</span>
                  </div>
                </Link>
              );
            })
          )}
        </section>

        <footer className="pt-8 pb-4 text-center text-[11px] text-slate-400 space-y-3 border-t border-slate-200">
          <div className="pb-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScOBq_NVmGd5JBdc_KKNvTb6JI4wSBX7FRjhId5XIVzKZGHJw/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs transition"
            >
              <span>📮</span>
              <span>ご意見・ご要望・不具合報告はこちら</span>
              <span>↗</span>
            </a>
          </div>

          <p className="font-bold text-slate-500">【免責事項・ご注意】</p>
          <p className="leading-relaxed">
            当Webサイト（俺ファンド）は、ユーザーがアイデアやエンターテインメント目的で作成した仮想ポートフォリオを共有するプラットフォームです。特定の有価証券や金融商品の売買・投資勧誘を目的としたものではありません。実際の投資判断はご自身の責任において行っていただきますようお願いいたします。
          </p>
        </footer>
      </main>
    </div>
  );
}