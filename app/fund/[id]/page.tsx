'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  price?: number;
  shares?: number;
  amount?: number;
  ratio: number;
  color: string;
};

type Fund = {
  id: string;
  title: string;
  author: string;
  period: string;
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

// ⚾️ 例として残す大谷ファンド（フォールバック用）
const OHTANI_FUND_EXAMPLE: Fund = {
  id: '1',
  title: '大谷CM採用企業ポートフォリオ',
  author: '大谷ファン',
  period: '長期',
  created_at: '2026-08-01T00:00:00.000Z',
  funny_count: 42,
  description:
    '大谷翔平選手がCM出演・スポンサー契約を結んでいる企業株だけで組んだ勝負ファンド！彼の世界的な活躍とともに企業価値も爆上がりすることを期待しています。',
  items: [
    { name: 'コーセー', ratio: 30, color: '#3B82F6' },
    { name: '伊藤園', ratio: 30, color: '#10B981' },
    { name: 'セイコーグループ', ratio: 20, color: '#F59E0B' },
    { name: '西川', ratio: 20, color: '#EC4899' },
  ],
};

export default function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const fundId = resolvedParams.id;
  const router = useRouter();

  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // コメント用ステート
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, author: '株初心者', text: 'コンセプトが最高！真似してみたいです笑' },
    { id: 2, author: '名無しさん', text: '短期だとボラティリティ高そうだけど面白い！' },
  ]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    async function fetchFund() {
      setLoading(true);

      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .eq('id', fundId)
        .single();

      if (error || !data) {
        console.warn('Supabaseからの取得に失敗したため、例（大谷ファンド）を表示します:', error);
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
    if (!fund) return;

    const newCount = (fund.funny_count || 0) + 1;

    // UIを即時更新
    setFund({ ...fund, funny_count: newCount });

    // Supabase上のデータであれば更新処理を実行
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
    setComments([...comments, { id: Date.now(), author: 'あなた', text: newComment }]);
    setNewComment('');
  };

  let cumulativeAngle = 0;

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
          className="text-xs bg-indigo-600 text-white font-bold px-4 py-2 rounded-full hover:bg-indigo-700 transition"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

  const totalAmount = fund.total_amount || fund.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-bold text-slate-800">ファンド詳細</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* ファンド概要 */}
        <article className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <div>
              投稿者: <span className="font-bold text-slate-700">@{fund.author}</span>
              {fund.created_at && `・${new Date(fund.created_at).toLocaleDateString('ja-JP')}`}
            </div>
            <span className="bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-0.5 rounded-full">
              {fund.period}
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">{fund.title}</h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {fund.description || '説明はありません。'}
            </p>
          </div>

          {/* ポートフォリオ構成 ＆ ビジュアル切り替え */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                📊 ポートフォリオ構成
              </h2>
            </div>

            {/* 表示切り替えタブ */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`flex-1 py-1 rounded-lg transition ${
                  chartType === 'pie'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🍕 円グラフ
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex-1 py-1 rounded-lg transition ${
                  chartType === 'bar'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 バー表示
              </button>
            </div>

            {/* グラフ描画エリア */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
              {chartType === 'pie' ? (
                <div className="relative w-64 h-64 my-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {fund.items &&
                      fund.items.map((item, idx) => {
                        if (item.ratio <= 0) return null;
                        const strokeDasharray = `${item.ratio} ${100 - item.ratio}`;
                        const strokeDashoffset = -cumulativeAngle;
                        cumulativeAngle += item.ratio;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="15.91549430918954"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="11"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        );
                      })}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      TOTAL
                    </span>
                    <span className="text-lg font-black tracking-tight text-slate-800 leading-none">
                      {totalAmount > 0 ? `¥${totalAmount.toLocaleString()}` : '構成割合'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2 py-3">
                  <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-200 shadow-inner">
                    {fund.items &&
                      fund.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: `${Math.max(0, Math.min(100, item.ratio))}%`,
                            backgroundColor: item.color,
                          }}
                          className="transition-all duration-200"
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* 銘柄一覧 */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mt-3">
              {fund.items &&
                fund.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-sm bg-white">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                        {item.price && item.shares ? (
                          <span className="text-xs text-slate-400 block">
                            ¥{item.price.toLocaleString()} × {item.shares}株
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">{item.ratio}%</span>
                  </div>
                ))}
            </div>
          </div>

          {/* フッターアクション */}
          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <button
              onClick={handleFunnyClick}
              className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-5 py-2.5 rounded-full transition active:scale-95"
            >
              <span>💡 おもしろ！</span>
              <span className="bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full text-xs">
                {fund.funny_count || 0}
              </span>
            </button>
            <span className="text-xs text-slate-400">🔒 編集不可（改ざん防止済）</span>
          </div>
        </article>

        {/* コメントセクション */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <span>💬 コメント</span>
            <span className="text-xs text-slate-400 font-normal">({comments.length}件)</span>
          </h2>

          <div className="space-y-2.5">
            {comments.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-600">@{c.author}</div>
                <div className="text-slate-800">{c.text}</div>
              </div>
            ))}
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
              className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition active:scale-95 flex-shrink-0"
            >
              送信
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}