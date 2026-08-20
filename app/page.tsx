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

export default function HomePage() {
  const router = useRouter();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 relative">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <h1 className="text-lg font-black text-indigo-600 tracking-tight">俺ファンド</h1>
        <button
          type="button"
          onClick={() => router.push('/create')}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-full transition cursor-pointer"
        >
          ＋ 作成する
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-sm space-y-2">
          <h2 className="text-base font-extrabold">理想のポートフォリオを作ろう📈</h2>
          <p className="text-xs opacity-90 leading-relaxed">
            気になる銘柄や推し企業でオリジナルのファンドを作成・共有できるプラットフォームです。
          </p>
        </div>

        <div className="flex justify-between items-center pt-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            🔥 新着ファンド一覧
          </h3>
          <span className="text-xs text-slate-400">{funds.length}件</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">読み込み中...</div>
        ) : funds.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-3">
            <p className="text-sm font-bold text-slate-600">まだ投稿されたファンドはありません</p>
            <button
              type="button"
              onClick={() => router.push('/create')}
              className="text-xs bg-indigo-600 text-white font-bold px-4 py-2 rounded-full hover:bg-indigo-700 transition cursor-pointer"
            >
              最初のファンドを作る 🚀
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {funds.map((fund) => {
              const rawItems = fund.items || [];
              const itemsList = rawItems.map((item, idx) => {
                const name = (item.name || `銘柄${idx + 1}`).trim();
                const amount = item.amount || 0;
                const ratio = item.ratio || 0;
                return {
                  name,
                  amount,
                  ratio,
                  color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                };
              });

              const totalAmt = fund.total_amount || itemsList.reduce((s, i) => s + i.amount, 0);

              return (
                <div
                  key={fund.id}
                  onClick={() => router.push(`/fund/${fund.id}`)}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:shadow-md transition duration-200 cursor-pointer space-y-3 active:scale-[0.99]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{fund.title}</h4>
                      <p className="text-[11px] text-slate-400">@{fund.author}</p>
                    </div>
                    {totalAmt > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md shrink-0">
                        ¥{totalAmt.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {fund.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl">
                      {fund.description}
                    </p>
                  )}

                  {/* 1本バープレビュー */}
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    {itemsList.map((item, idx) => {
                      const pct = totalAmt > 0 ? Math.floor((item.amount / totalAmt) * 100) : item.ratio || (100 / itemsList.length);
                      return (
                        <div
                          key={idx}
                          style={{
                            flexGrow: Math.max(pct, 2),
                            backgroundColor: item.color,
                          }}
                          className="h-full first:rounded-l-full last:rounded-r-full shrink-0"
                          title={`${item.name}: ${pct}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
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