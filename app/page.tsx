'use client';

import React, { useState, useEffect } from 'react';
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
  period: string;
  funny_count: number;
  description: string;
  items: FundItem[];
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

const SAMPLE_FUNDS: Fund[] = [
  {
    id: '1',
    title: '大谷CM採用企業ポートフォリオ',
    author: '大谷ファン ◆abc12345',
    period: '長期',
    funny_count: 42,
    description: '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！彼の世界的な活躍とともに企業価値も爆上がりすることを期待しています。',
    items: [
      { name: 'コーセー', ratio: 30, color: '#3B82F6' },
      { name: '伊藤園', ratio: 30, color: '#10B981' },
      { name: 'セイコーグループ', ratio: 20, color: '#F59E0B' },
      { name: '西川', ratio: 20, color: '#EC4899' },
    ],
  },
  {
    id: '2',
    title: '深夜のラーメン＆サウナ欲望全振ファンド',
    author: 'ととのい太郎',
    period: '短期',
    funny_count: 28,
    description: '自分の大好きな「深夜ラーメン」と「週末サウナ」を提供している企業に全集中投資。難しい分析は不要、パッションと愛だけで勝負！',
    items: [
      { name: 'ギフトHD（町田商店）', ratio: 50, color: '#EF4444' },
      { name: '極楽湯HD', ratio: 30, color: '#8B5CF6' },
      { name: '現金（待機資金）', ratio: 20, color: '#6B7280' },
    ],
  },
  {
    id: '3',
    title: 'オルカン一括＆暗号資産スパイス',
    author: '堅実チャレンジャー ◆xyz98765',
    period: '中期',
    funny_count: 15,
    description: '王道の「eMAXIS Slim 全世界株式」で超堅実に土台を固めつつ、爆発力のあるビットコインを15%だけスパイスとして投入したハイブリッド構成。',
    items: [
      { name: '全世界株式（オルカン）', ratio: 85, color: '#2563EB' },
      { name: '暗号資産（BTC/ETH）', ratio: 15, color: '#F97316' },
    ],
  },
];

type TabType = 'popular' | 'trending' | 'weekly';

function RankingList({ funds }: { funds: Fund[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const displayFunds = funds.length > 0 ? funds : SAMPLE_FUNDS;

  return (
    <div className="max-w-xl mx-auto my-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex gap-4 border-b border-slate-100 pb-3 mb-4">
        <button
          onClick={() => setActiveTab('popular')}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === 'popular'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          🔥 人気
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === 'trending'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          🚀 急上昇
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === 'weekly'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          🏆 週間ランキング
        </button>
      </div>

      <div className="space-y-3">
        {displayFunds.slice(0, 3).map((item, index) => (
          <a
            key={item.id}
            href={`/fund/${item.id}`}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-decoration-none"
          >
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm text-slate-400 w-4 text-center">
                {index + 1}
              </span>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">
                {item.title}
              </span>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full whitespace-nowrap">
              {item.funny_count || 0} おもしろ！
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [chartTypes, setChartTypes] = useState<Record<string, 'pie' | 'bar'>>({});
  const [hoveredItems, setHoveredItems] = useState<Record<string, FundItem | null>>({});

  useEffect(() => {
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

  const filteredFunds = funds.filter((fund) => {
    if (selectedPeriod !== 'すべて' && fund.period !== selectedPeriod) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();

    const matchTitle = fund.title?.toLowerCase().includes(query);
    const matchDescription = fund.description?.toLowerCase().includes(query);
    const matchAuthor = fund.author?.toLowerCase().includes(query);
    const matchItems = fund.items?.some((item) =>
      item.name?.toLowerCase().includes(query)
    );

    return matchTitle || matchDescription || matchAuthor || matchItems;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600">俺ファンド</h1>
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
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs text-indigo-700 font-medium">
              <span>「<strong>{searchQuery}</strong>」で検索中</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-indigo-500 underline hover:text-indigo-800 ml-2"
              >
                クリア
              </button>
            </div>
          )}

          <div className="flex gap-2 text-sm overflow-x-auto pb-1">
            {['すべて', '短期', '中期', '長期'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                  selectedPeriod === period
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </section>

        <section>
          <RankingList funds={funds} />
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

              const itemsList = fund.items || [];
              
              // 🔄【改善1】同じ名前の銘柄を自動的に集計・統合する処理
              const mergedMap = new Map<string, { name: string; ratio: number; color: string }>();
              
              const calculatedTotal = itemsList.reduce((sum, item) => {
                const itemAmt = item.amount || (Number(item.price || 0) * Number(item.shares || 0));
                return sum + itemAmt;
              }, 0);

              itemsList.forEach((item, idx) => {
                const name = item.name || `銘柄${idx + 1}`;
                const itemAmt = item.amount || (Number(item.price || 0) * Number(item.shares || 0));
                let itemRatio = Number(item.ratio || 0);

                if (!itemRatio && calculatedTotal > 0) {
                  itemRatio = Math.round((itemAmt / calculatedTotal) * 100);
                }

                if (mergedMap.has(name)) {
                  const existing = mergedMap.get(name)!;
                  existing.ratio += itemRatio;
                } else {
                  mergedMap.set(name, {
                    name,
                    ratio: itemRatio,
                    color: item.color || DEFAULT_COLORS[mergedMap.size % DEFAULT_COLORS.length],
                  });
                }
              });

              const formattedItems = Array.from(mergedMap.values());
              let cumulativeAngle = 0;

              return (
                <a
                  key={fund.id}
                  href={`/fund/${fund.id}`}
                  className="block bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition active:scale-98"
                >
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={(e) => handleAuthorClick(fund.author || '匿名', e)}
                      className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1 transition"
                      title="このユーザーの投稿一覧を見る"
                    >
                      <span>@{fund.author || '匿名'}</span>
                      <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.2 rounded">投稿一覧 🔍</span>
                    </button>
                    <span className="bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-0.5 rounded-full">
                      {fund.period}
                    </span>
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
                          className={`px-2 py-0.5 rounded-md transition ${
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
                          className={`px-2 py-0.5 rounded-md transition ${
                            currentChart === 'bar'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          📊 バー
                        </button>
                      </div>
                    </div>

                    {/* 🍕 インタラクティブ円グラフ */}
                    {currentChart === 'pie' ? (
                      <div className="flex flex-col items-center justify-center pt-2 pb-3 px-2 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="relative w-80 h-80 flex items-center justify-center">
                          {/* 🔄【改善2】12時（真上）始点固定 (-rotate-90) */}
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            {formattedItems.map((item, idx) => {
                              if (item.ratio <= 0) return null;
                              const strokeDasharray = `${item.ratio} ${100 - item.ratio}`;
                              const strokeDashoffset = -cumulativeAngle;
                              cumulativeAngle += item.ratio;

                              const isHovered = activeHoveredItem?.name === item.name;

                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="22"
                                  fill="transparent"
                                  stroke={item.color}
                                  strokeWidth={isHovered ? 21 : 17}
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all duration-200 cursor-pointer"
                                  style={{
                                    opacity: activeHoveredItem && !isHovered ? 0.35 : 1,
                                    transformOrigin: '50px 50px',
                                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    setHoveredItems((prev) => ({ ...prev, [fund.id]: item }));
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation();
                                    setHoveredItems((prev) => ({ ...prev, [fund.id]: null }));
                                  }}
                                />
                              );
                            })}

                            {/* 🔄【改善3】ドーナツ穴中央の透明カバー（穴に乗った時はホバー解除） */}
                            <circle
                              cx="50"
                              cy="50"
                              r="13.5"
                              fill="transparent"
                              className="cursor-default"
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoveredItems((prev) => ({ ...prev, [fund.id]: null }));
                              }}
                            />
                          </svg>
                        </div>

                        {/* 📍 銘柄表示バッジ（未ホバー時は何も表示しない） */}
                        <div className="h-8 mt-1 flex items-center justify-center">
                          {activeHoveredItem && (
                            <div className="flex items-center gap-2 bg-white px-3.5 py-1 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: activeHoveredItem.color }}
                              />
                              <span className="text-xs font-bold text-slate-800">
                                {activeHoveredItem.name}
                              </span>
                              <span
                                className="text-xs font-black px-2 py-0.5 rounded-md text-white"
                                style={{ backgroundColor: activeHoveredItem.color }}
                              >
                                {activeHoveredItem.ratio}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 shadow-inner my-2">
                        {formattedItems.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ width: `${item.ratio}%`, backgroundColor: item.color }}
                            title={`${item.name}: ${item.ratio}%`}
                          />
                        ))}
                      </div>
                    )}

                    {/* 凡例リスト */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600 pt-1">
                      {formattedItems.map((item, idx) => {
                        const isHovered = activeHoveredItem?.name === item.name;
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() =>
                              setHoveredItems((prev) => ({ ...prev, [fund.id]: item }))
                            }
                            onMouseLeave={() =>
                              setHoveredItems((prev) => ({ ...prev, [fund.id]: null }))
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition cursor-pointer ${
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
                              {item.name} ({item.ratio}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                    <button
                      onClick={(e) => handleFunnyClick(fund.id, fund.funny_count, e)}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition active:scale-95"
                    >
                      <span>💡 おもしろ</span>
                      <span>{fund.funny_count || 0}</span>
                    </button>
                    <span className="text-xs text-indigo-600 font-semibold">詳細を見る →</span>
                  </div>
                </a>
              );
            })
          )}
        </section>

        <footer className="pt-8 pb-4 text-center text-[11px] text-slate-400 space-y-2 border-t border-slate-200">
          <p className="font-bold text-slate-500">【免責事項・ご注意】</p>
          <p className="leading-relaxed">
            当Webサイト（俺ファンド）は、ユーザーがアイデアやエンターテインメント目的で作成した仮想ポートフォリオを共有するプラットフォームです。特定の有価証券や金融商品の売買・投資勧誘を目的としたものではありません。実際の投資判断はご自身の責任において行っていただきますようお願いいたします。
          </p>
        </footer>
      </main>

      <a
        href="/create"
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white font-bold px-5 py-3.5 rounded-full shadow-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm active:scale-95"
      >
        <span>➕</span>
        <span>自分で作る</span>
      </a>
    </div>
  );
}