'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type FundItem = {
  name: string;
  price: string;
  shares: string;
  color: string;
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

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

export default function CreateFundPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<FundItem[]>([
    { name: '', price: '', shares: '1', color: DEFAULT_COLORS[0] },
    { name: '', price: '', shares: '1', color: DEFAULT_COLORS[1] },
  ]);

  const handleAddItem = () => {
    const nextColor = DEFAULT_COLORS[items.length % DEFAULT_COLORS.length];
    setItems([...items, { name: '', price: '', shares: '1', color: nextColor }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FundItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // 各銘柄の金額（株価 × 株数）は小数点以下切り捨て
  const calculatedItems = items.map((item, idx) => {
    const p = parseFloat(item.price) || 0;
    const s = parseFloat(item.shares) || 0;
    const amount = Math.floor(p * s);
    return {
      name: item.name.trim() || `銘柄${idx + 1}`,
      price: p,
      shares: s,
      amount,
      color: item.color,
    };
  });

  const totalAmount = Math.floor(calculatedItems.reduce((sum, item) => sum + item.amount, 0));

  let currentAngle = 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('ファンド名を入力してください。');
      return;
    }

    const validItems = calculatedItems.filter((i) => i.amount > 0);
    if (validItems.length === 0) {
      alert('株価と株数を入力して、合計金額が1円以上になるように設定してください。');
      return;
    }

    setIsSubmitting(true);

    const formattedItemsToSave = validItems.map((item) => ({
      name: item.name,
      price: item.price,
      shares: item.shares,
      amount: item.amount,
      ratio: totalAmount > 0 ? Math.floor((item.amount / totalAmount) * 100) : 0,
      color: item.color,
    }));

    const { data, error } = await supabase
      .from('funds')
      .insert([
        {
          title: title.trim(),
          author: author.trim() || '匿名',
          description: description.trim(),
          total_amount: totalAmount,
          funny_count: 0,
          items: formattedItemsToSave,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('作成エラー:', error);
      alert('ファンドの作成に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
      return;
    }

    router.push(`/fund/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← 戻る
        </button>
        <h1 className="text-base font-bold text-slate-800">ファンド作成</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700">📌 基本情報</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ファンド名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 俺のAI成長ファンド"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">投稿者名</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="例: チャレンジャー（空欄なら匿名）"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ファンドの説明・こだわり</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="このファンドの狙いや選定理由を自由に書いてください"
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700">📊 組み入れ銘柄</h2>
              <span className="text-xs font-bold text-indigo-600">
                合計: ¥{totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-grow">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <input
                        type="text"
                        placeholder={`銘柄名（例: トヨタ自動車）`}
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-red-500 text-xs px-1 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">想定株価 (円)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="例: 2500.5"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">保有株数 (小数可)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="例: 1.5"
                        value={item.shares}
                        onChange={(e) => handleItemChange(idx, 'shares', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {calculatedItems[idx].amount > 0 && (
                    <div className="text-right text-[11px] font-bold text-slate-500 pt-0.5">
                      金額: ¥{calculatedItems[idx].amount.toLocaleString()} ({totalAmount > 0 ? Math.floor((calculatedItems[idx].amount / totalAmount) * 100) : 0}%)
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition"
            >
              ＋ 銘柄を追加する
            </button>
          </div>

          {/* プレビュー円グラフ（隙間なし） */}
          {totalAmount > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 mb-2">構成プレビュー</span>
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {calculatedItems.map((item, idx) => {
                    if (item.amount <= 0) return null;
                    const sliceAngle = (item.amount / totalAmount) * 360;
                    const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + safeAngle;
                    currentAngle += safeAngle;

                    return (
                      <path
                        key={idx}
                        d={getDonutSlicePath(100, 100, 86, 48, startAngle, endAngle)}
                        fill={item.color}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition text-sm active:scale-98"
          >
            {isSubmitting ? '作成中...' : '🚀 ファンドを公開する'}
          </button>
        </form>
      </main>
    </div>
  );
}