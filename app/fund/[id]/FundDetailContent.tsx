'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  period?: string;
  funny_count: number;
  description: string;
  total_amount?: number;
  items: FundItem[];
  created_at?: string;
};

type Comment = {
  id: number;
  author: string;
  text: string;
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

const OHTANI_FUND_EXAMPLE: Fund = {
  id: '1',
  title: '大谷CM採用企業ポートフォリオ',
  author: '大谷ファン',
  created_at: '2026-08-01T00:00:00.000Z',
  funny_count: 0,
  description:
    '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！彼の世界的な活躍とともに企業価値も爆上がりすることを期待しています。',
  items: [
    { name: 'コーセー (4922)', ratio: 30, color: '#3B82F6' },
    { name: '伊藤園 (2593)', ratio: 30, color: '#10B981' },
    { name: 'セイコーグループ (8050)', ratio: 20, color: '#F59E0B' },
    { name: '西川', ratio: 20, color: '#EC4899' },
  ],
};

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

export default function FundDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const fundId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === '1';

  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [hoveredItem, setHoveredItem] = useState<{ name: string; ratio: number; color: string; amount?: number; price?: number; shares?: number } | null>(null);
  const [reactedFunds, setReactedFunds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reacted_funds');
      if (saved) {
        setReactedFunds(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    async function fetchFund() {
      setLoading(true);

      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .eq('id', fundId)
        .single();

      if (error || !data) {
        setFund(OHTANI_FUND_EXAMPLE);
      } else {
        setFund(data);
      }
      setLoading(false);
    }

    if (fundId) {
      fetchFund();
    }
  }, [fundId]);

  const handleFunnyClick = async () => {
    if (!fund || reactedFunds.includes(fund.id)) return;

    const nextReacted = [...reactedFunds, fund.id];
    setReactedFunds(nextReacted);
    try {
      localStorage.setItem('reacted_funds', JSON.stringify(nextReacted));
    } catch {
      // ignore
    }

    const newCount = (fund.funny_count || 0) + 1;
    setFund({ ...fund, funny_count: newCount });

    const { error } = await supabase
      .from('funds')
      .update({ funny_count: newCount })
      .eq('id', fund.id);

    if (error) {
      console.error('更新エラー:', error);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, { id: Date.now(), author: 'あなた', text: newComment.trim() }]);
    setNewComment('');
  };

  const handleDeleteFund = async () => {
    if (!fund) return;
    const adminKey = prompt('管理者パスワードを入力してください:');
    if (!adminKey) return;

    if (!confirm('【警告】本当にこのファンドを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fund.id, adminKey }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('ファンドを完全に削除しました。');
        router.push('/');
        router.refresh();
      } else {
        alert(`削除失敗: ${result.error || '不明なエラー'}`);
      }
    } catch {
      alert('通信エラーが発生しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-slate-600">
        <p className="text-sm font-bold">データが見つかりません。</p>
        <button
          onClick={() => router.push('/')}
          className="text-xs bg-indigo-600 text-white font-bold px-4 py-2 rounded-full hover:bg-indigo-700 transition cursor-pointer"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

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
  const hasReacted = reactedFunds.includes(fund.id);

  const handleShareToX = () => {
    const topItemsText = displayItems
      .slice(0, 4)
      .map((item) => `・${item.name} ${item.displayRatio}%`)
      .join('\n');
    const remainingText = displayItems.length > 4 ? `\n・他${displayItems.length - 4}銘柄` : '';

    const text = `📊「${fund.title}」を考えました！\n作成者: @${fund.author}\n\n${topItemsText}${remainingText}\n\nこの構成で勝てると思う？あなたならどう組む？\n#俺ファンド #株式投資 #ポートフォリオ`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://ore-fund.vercel.app/fund/${fund.id}`;

    const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterIntent, '_blank', 'noopener,noreferrer');
  };

  const handleForkFund = () => {
    if (!fund) return;
    router.push(`/create?fork=${fund.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 relative">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          ← トップへ戻る
        </button>
        <h1 className="text-base font-bold text-slate-800">ファンド詳細</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        <article className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <div>
              投稿者: <span className="font-bold text-slate-700">@{fund.author}</span>
              {formattedCreatedDate && ` ・ ${formattedCreatedDate}`}
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">{fund.title}</h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {fund.description || '説明はありません。'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                📊 ポートフォリオ構成
              </h2>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  📊 1本バー
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    chartType === 'pie'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🍕 円グラフ
                </button>
              </div>
            </div>

            {chartType === 'bar' ? (
              <div className="py-2">
                <div className="h-9 w-full rounded-full overflow-hidden flex bg-slate-100 shadow-inner p-1 gap-1 items-center">
                  {displayItems.map((item, idx) => {
                    const isHovered = hoveredItem?.name === item.name;
                    const widthPercent = (item.weight / weightTotal) * 100;
                    if (widthPercent <= 0) return null;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredItem({ name: item.name, ratio: item.displayRatio, color: item.color, amount: item.amount, price: item.price, shares: item.shares })}
                        onMouseLeave={() => setHoveredItem(null)}
                        style={{
                          flexGrow: item.weight,
                          backgroundColor: item.color,
                          minWidth: '18px',
                          transform: isHovered ? 'scaleY(1.22)' : 'scaleY(1)',
                          boxShadow: isHovered ? `0 0 12px ${item.color}` : 'none',
                          filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
                          zIndex: isHovered ? 10 : 1,
                        }}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden shrink-0"
                        title={`${item.name}: ${item.displayRatio}%`}
                      >
                        {item.displayRatio >= 8 && (
                          <span className="text-[11px] font-black text-white drop-shadow-xs truncate px-1 select-none">
                            {item.displayRatio}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="h-7 mt-2 flex items-center justify-center">
                  {hoveredItem ? (
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: hoveredItem.color }}
                      />
                      <span className="font-bold text-slate-800">{hoveredItem.name}</span>
                      <span className="font-black text-indigo-600">{hoveredItem.ratio}%</span>
                    </div>
                  ) : (
                    totalAmount > 0 && (
                      <span className="text-[11px] font-bold text-slate-400">
                        合計設定額: ¥{totalAmount.toLocaleString()}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
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

                      const isHovered = hoveredItem?.name === item.name;
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
                            opacity: hoveredItem && !isHovered ? 0.35 : 1,
                          }}
                          onMouseEnter={() => setHoveredItem({ name: item.name, ratio: item.displayRatio, color: item.color, amount: item.amount, price: item.price, shares: item.shares })}
                          onMouseLeave={() => setHoveredItem(null)}
                        />
                      );
                    })}

                    <circle
                      cx="100"
                      cy="100"
                      r="47"
                      fill="transparent"
                      className="cursor-default"
                      onMouseEnter={() => setHoveredItem(null)}
                    />
                  </svg>
                </div>

                <div className="h-8 mt-1 flex items-center justify-center">
                  {hoveredItem ? (
                    <div className="flex items-center gap-2 bg-white px-3.5 py-1 rounded-xl border border-slate-200 shadow-sm">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hoveredItem.color }}
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {hoveredItem.name}
                      </span>
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-md text-white"
                        style={{ backgroundColor: hoveredItem.color }}
                      >
                        {hoveredItem.ratio}%
                      </span>
                    </div>
                  ) : (
                    totalAmount > 0 && (
                      <span className="text-xs font-bold text-slate-600">
                        合計設定額: ¥{totalAmount.toLocaleString()}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mt-3">
              {displayItems.map((item, idx) => {
                const isHovered = hoveredItem?.name === item.name;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredItem({ name: item.name, ratio: item.displayRatio, color: item.color, amount: item.amount, price: item.price, shares: item.shares })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex justify-between items-center p-3 text-sm transition-all duration-150 cursor-pointer ${
                      isHovered ? 'bg-indigo-50/70 pl-4' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-150"
                        style={{
                          backgroundColor: item.color,
                          transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                        }}
                      />
                      <div>
                        <span className={`font-medium ${isHovered ? 'text-indigo-900 font-bold' : 'text-slate-800'}`}>
                          {item.name}
                        </span>
                        {item.price && item.shares ? (
                          <span className="text-xs text-slate-400 block">
                            ¥{item.price.toLocaleString()} × {item.shares}株
                          </span>
                        ) : item.amount ? (
                          <span className="text-xs text-slate-400 block">
                            ¥{item.amount.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`font-bold ${isHovered ? 'text-indigo-900 font-extrabold' : 'text-slate-900'}`}>
                      {item.displayRatio}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleShareToX}
              className="w-full bg-black hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>このファンドをポスト（共有）</span>
            </button>

            <button
              type="button"
              onClick={handleForkFund}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-4 rounded-xl border border-indigo-200 transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-xs"
            >
              <span>🍴 この構成をアレンジして作成（コピー）</span>
            </button>
          </div>

          <div className="pt-2 flex justify-start items-center border-t border-slate-100">
            <button
              onClick={handleFunnyClick}
              disabled={hasReacted}
              className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition cursor-pointer ${
                hasReacted
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'text-amber-700 bg-amber-50 hover:bg-amber-100 active:scale-95'
              }`}
            >
              <span>{hasReacted ? '💡 納得済' : '💡 納得'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${hasReacted ? 'bg-slate-200 text-slate-600' : 'bg-amber-200/60 text-amber-900'}`}>
                {fund.funny_count || 0}
              </span>
            </button>
          </div>
        </article>

        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <span>💬 コメント</span>
            <span className="text-xs text-slate-400 font-normal">({comments.length}件)</span>
          </h2>

          <div className="space-y-2.5">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">まだコメントはありません。</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-600">@{c.author}</div>
                  <div className="text-slate-800">{c.text}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="コメントを入力..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-grow px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition active:scale-95 flex-shrink-0 cursor-pointer"
            >
              送信
            </button>
          </form>
        </section>

        {isAdmin && (
          <div className="pt-6 pb-4 text-center border-t border-red-100">
            <button
              type="button"
              onClick={handleDeleteFund}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              {isDeleting ? '削除中...' : '🗑️ 管理者権限でこのファンドを削除'}
            </button>
          </div>
        )}
      </main>

      {/* スクロールしても常に画面右下に追従する「自分で作る」ボタン（X/Twitter投稿ボタン風） */}
      <button
        type="button"
        onClick={() => router.push('/create')}
        className="fixed bottom-6 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold px-4 py-3.5 rounded-full shadow-xl transition-all duration-200 flex items-center gap-2 text-xs cursor-pointer border border-white/20"
        title="新しいファンドを作成"
      >
        <span className="text-base leading-none">＋</span>
        <span>ファンドを作成</span>
      </button>
    </div>
  );
}