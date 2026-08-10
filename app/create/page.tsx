'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface StockItem {
  id: string;
  name: string;
  price: number;
  shares: number;
  color: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

// 2ちゃんねる風トリップ（識別用ハッシュID）生成関数
function generateTrip(inputName: string): string {
  const trimmed = inputName.trim();
  if (!trimmed) return '名無し';

  const hashIndex = trimmed.indexOf('#');
  if (hashIndex === -1) {
    return trimmed; // #がない場合は入力された名前そのまま
  }

  const namePart = trimmed.substring(0, hashIndex) || '名無し';
  const keyPart = trimmed.substring(hashIndex + 1);

  if (!keyPart) return namePart;

  // キー文字列から簡単な8桁ハッシュIDを生成 (◆abc12345 形式)
  let hash = 0;
  for (let i = 0; i < keyPart.length; i++) {
    hash = (hash << 5) - hash + keyPart.charCodeAt(i);
    hash |= 0;
  }
  const tripKey = Math.abs(hash).toString(36).substring(0, 8);

  return `${namePart} ◆${tripKey}`;
}

export default function CreateFundPage() {
  const router = useRouter();

  const [rawAuthor, setRawAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('長期');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [items, setItems] = useState<StockItem[]>([
    { id: '1', name: '任天堂', price: 8000, shares: 10, color: COLORS[0] },
    { id: '2', name: 'ソニーグループ', price: 3000, shares: 40, color: COLORS[1] },
  ]);

  const displayAuthor = generateTrip(rawAuthor);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.shares, 0);

  const calculatedItems = items.map((item) => {
    const amount = item.price * item.shares;
    const ratio = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
    return { ...item, amount, ratio };
  });

  const handleAddItem = () => {
    if (items.length >= 8) return;
    const newId = Date.now().toString();
    const nextColor = COLORS[items.length % COLORS.length];
    setItems([...items, { id: newId, name: '', price: 0, shares: 0, color: nextColor }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof StockItem, value: string | number) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (totalAmount <= 0) {
      alert('株数と単価を入力して、合計額が0円より大きくなるように設定してください。');
      return;
    }

    const isConfirmed = window.confirm(
      `【最終確認】\n投稿者名: @${displayAuthor}\n\n「俺ファンド」のルールにより、一度投稿したファンドの修正・削除はできません。\n投稿しますか？`
    );

    if (isConfirmed) {
      setLoading(true);

      const { error } = await supabase.from('funds').insert([
        {
          title,
          author: displayAuthor,
          period,
          funny_count: 0,
          description: description || '説明はありません。',
          total_amount: totalAmount,
          items: calculatedItems,
        },
      ]);

      setLoading(false);

      if (error) {
        console.error('保存エラー詳細:', error);
        setErrorMsg(`投稿に失敗しました: ${error.message}`);
      } else {
        alert('ファンドを投稿しました！');
        router.push('/');
      }
    }
  };

  let cumulativeAngle = 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-bold text-slate-800">新規ファンド作成</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-bold leading-relaxed">
              {errorMsg}
            </div>
          )}

          <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              1. ファンド基本情報
            </h2>

            {/* 🏷 投稿者名＆トリップ設定 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                投稿者名 （空欄で「名無し」 / `#`を付けて専用ID化）
              </label>
              <input
                type="text"
                placeholder="例：太郎#パスワード"
                value={rawAuthor}
                onChange={(e) => setRawAuthor(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                表示名: <span className="font-bold text-indigo-600">@{displayAuthor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ファンド名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例：大谷CM採用企業ポートフォリオ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                コンセプト・テーマの説明
              </label>
              <textarea
                rows={3}
                placeholder="例：この銘柄を選んだ理由や、どんなコンセプトなのかを熱く語ってください！"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                想定運用期間
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['短期', '中期', '長期'].map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition ${
                      period === p
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                2. 構成銘柄 ＆ 金額設定
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                合計: ¥{totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`flex-1 py-1.5 rounded-lg transition ${
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
                className={`flex-1 py-1.5 rounded-lg transition ${
                  chartType === 'bar'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 バー表示
              </button>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-4">
              {chartType === 'pie' ? (
                <div className="w-56 h-56 my-1 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {calculatedItems.map((item, idx) => {
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
                </div>
              ) : (
                <div className="w-full space-y-2 py-4">
                  <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-200 shadow-inner">
                    {calculatedItems.map((item, idx) => (
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

              <div className="text-center pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  合計設定額
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  ¥{totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 pt-2 text-xs text-slate-600 border-t border-slate-200/60 w-full">
                {calculatedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-2xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700">
                      {item.name || `銘柄${idx + 1}`}: <strong className="text-slate-900">¥{item.amount.toLocaleString()} ({item.ratio}%)</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {items.map((item, index) => {
                const amount = item.price * item.shares;
                const ratio = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;

                return (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                    <div className="flex gap-2 items-center">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <input
                        type="text"
                        required
                        placeholder={`銘柄名 ${index + 1}`}
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        className="flex-grow px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-500 min-w-[50px] text-right">
                        {ratio}%
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-red-500 px-1 font-bold text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-1 font-medium">購入単価 (円)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="例: 5000"
                          value={item.price || ''}
                          onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1 font-medium">株数</label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="例: 100"
                          value={item.shares || ''}
                          onChange={(e) => handleItemChange(item.id, 'shares', Number(e.target.value) || 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-500 font-medium">
                      小計: <span className="font-bold text-slate-800">¥{amount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length < 8 && (
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                ＋ 銘柄を追加する（最大8件）
              </button>
            )}
          </section>

          <section className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold mb-0.5">🔒 改ざん防止ルールについて</p>
              <p>
                「俺ファンド」では、予測や実績の信頼性を担保するため、**一度投稿したファンドの修正・削除はできません**。内容をよく確認して投稿してください。
              </p>
            </div>

            <button
              type="submit"
              disabled={totalAmount <= 0 || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition ${
                totalAmount > 0 && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-98'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {loading ? '投稿中...' : 'この内容でファンドを投稿する 🚀'}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}