'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { getCompanyNameByCode } from '@/app/lib/stockMaster';

type FundItem = {
  name: string;
  code?: string;
  price: string;
  shares: string;
  color: string;
  isAutoPrice?: boolean; // 公式株価がセットされたかどうかのフラグ
  isLoadingPrice?: boolean; // 株価取得中のローディングフラグ
};

// 視認性が高く、隣り合っても被りにくい12色のカラーパレット
const DEFAULT_COLORS = [
  '#2563EB', // ブルー
  '#EA580C', // オレンジ
  '#16A34A', // グリーン
  '#9333EA', // パープル
  '#DC2626', // レッド
  '#CA8A04', // イエローゴールド
  '#DB2777', // ピンク
  '#0D9488', // ティール
  '#4F46E5', // インディゴ
  '#65A30D', // ライム
  '#C026D3', // マゼンタ
  '#B45309', // アンバー
];

const RANDOM_AUTHORS = [
  '名無し投資家@含み損',
  '名無し投資家@億り人志望',
  '名無し株主@配当生活',
  '風吹けば名無しファンド',
  '靴磨きの名無し',
  '名無し投資家@全力買い',
  '名無し@ナンピン戦士',
  '名無し投資家@気絶投資法',
  '名無しトレーダー@逆張り',
  '名無し投資家@ガチホ中',
];

const SHARE_HOOKS = [
  'あなたならこのPF何点つけますか？🤔',
  'このポートフォリオ、アリですか？ナシですか？🔥',
  'ツッコミどころあれば容赦なく採点してください！🙇‍♂️',
  'この構成で勝てると思う？投資家の意見求む📈',
  '100点満点でガチ評価お願いします！💬',
];

async function calculateTripCode(key: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
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

function CreateFundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forkId = searchParams.get('fork');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [previewAuthor, setPreviewAuthor] = useState('');
  const [randomSeed, setRandomSeed] = useState<{ base: string; key: string }>({ base: '', key: '' });
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [items, setItems] = useState<FundItem[]>([
    { name: '', code: '', price: '', shares: '1', color: DEFAULT_COLORS[0] },
    { name: '', code: '', price: '', shares: '1', color: DEFAULT_COLORS[1] },
  ]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [createdFund, setCreatedFund] = useState<{ id: string; title: string; author: string; description?: string } | null>(null);

  const refreshRandomSeed = () => {
    const base = RANDOM_AUTHORS[Math.floor(Math.random() * RANDOM_AUTHORS.length)];
    const key = Math.random().toString(36).substring(2, 10);
    setRandomSeed({ base, key });
  };

  useEffect(() => {
    refreshRandomSeed();
  }, []);

  useEffect(() => {
    async function loadForkedFund() {
      if (!forkId) return;
      const { data, error } = await supabase
        .from('funds')
        .select('*')
        .eq('id', forkId)
        .single();

      if (!error && data) {
        setTitle(data.title || '');
        setDescription(data.description || '');

        let rawItems: any[] = [];
        if (Array.isArray(data.items)) {
          rawItems = data.items;
        } else if (typeof data.items === 'string') {
          try {
            rawItems = JSON.parse(data.items);
          } catch {
            rawItems = [];
          }
        }

        if (rawItems.length > 0) {
          const loadedItems: FundItem[] = rawItems.map((item, idx) => ({
            name: item.name || '',
            code: item.code || '',
            price: item.price !== undefined && item.price !== null ? String(item.price) : '',
            shares: item.shares !== undefined && item.shares !== null ? String(item.shares) : '1',
            color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            isAutoPrice: !!item.code,
          }));
          setItems(loadedItems);
        }
      }
    }
    loadForkedFund();
  }, [forkId]);

  useEffect(() => {
    async function updatePreview() {
      const trimmed = author.trim();
      const hashIndex = trimmed.indexOf('#');
      if (hashIndex !== -1) {
        const authorName = trimmed.slice(0, hashIndex).trim() || '名無し投資家';
        const tripKey = trimmed.slice(hashIndex + 1).trim();
        if (!tripKey) {
          setPreviewAuthor(authorName);
        } else {
          const code = await calculateTripCode(tripKey);
          setPreviewAuthor(`${authorName} ◆${code}`);
        }
      } else if (trimmed) {
        setPreviewAuthor(trimmed);
      } else if (randomSeed.base && randomSeed.key) {
        const code = await calculateTripCode(randomSeed.key);
        setPreviewAuthor(`${randomSeed.base} ◆${code}`);
      }
    }
    updatePreview();
  }, [author, randomSeed]);

  const handleAddItem = () => {
    const nextColor = DEFAULT_COLORS[items.length % DEFAULT_COLORS.length];
    setItems([...items, { name: '', code: '', price: '', shares: '1', color: nextColor }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
    if (hoveredIndex === index) setHoveredIndex(null);
  };

  // 銘柄名・コード入力時に公式株価を自動取得する関数
  const fetchStockPrice = async (index: number, code: string) => {
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index].isLoadingPrice = true;
      return updated;
    });

    try {
      const res = await fetch(`/api/stocks/quote?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.closePrice) {
          setItems((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index].price = String(data.closePrice);
              updated[index].isAutoPrice = true;
              updated[index].isLoadingPrice = false;
            }
            return updated;
          });
          return;
        }
      }
    } catch (e) {
      console.error('株価取得失敗:', e);
    }

    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index].isLoadingPrice = false;
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof FundItem, value: string) => {
    const newItems = [...items];
    let processedValue = value;

    if (field === 'name') {
      const codeTrimmed = value.trim();
      const matched = getCompanyNameByCode(codeTrimmed);
      if (matched) {
        processedValue = `${matched} (${codeTrimmed})`;
        newItems[index].code = codeTrimmed;
        fetchStockPrice(index, codeTrimmed);
      } else {
        const matchDigits = codeTrimmed.match(/\b\d{4}\b/);
        if (matchDigits) {
          newItems[index].code = matchDigits[0];
          fetchStockPrice(index, matchDigits[0]);
        }
      }
    }

     newItems[index] = {
      ...newItems[index],
      [field]: processedValue,
    };
    setItems(newItems);
  };

  const calculatedItems = items.map((item, idx) => {
    const p = parseFloat(item.price) || 0;
    const s = parseFloat(item.shares) || 0;
    const amount = Math.floor(p * s);
    return {
      index: idx,
      name: item.name.trim() || `銘柄${idx + 1}`,
      code: item.code || '',
      price: p,
      shares: s,
      amount,
      color: item.color,
      isAutoPrice: item.isAutoPrice,
      isLoadingPrice: item.isLoadingPrice,
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
    const finalAuthor = previewAuthor || '名無し投資家';

    // 確定前日終値を base_price としてSupabaseに保存
    const formattedItemsToSave = validItems.map((item) => ({
      name: item.name,
      code: item.code,
      price: item.price,
      base_price: item.price,
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
          author: finalAuthor,
          description: description.trim(),
          total_amount: totalAmount,
          funny_count: 0,
          items: formattedItemsToSave,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('作成エラー:', error);
      alert('ファンドの作成に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
      return;
    }

    setCreatedFund({
      id: data.id,
      title: data.title,
      author: data.author,
      description: data.description,
    });
    setShowShareModal(true);
    setIsSubmitting(false);
  };

  const handleConfirmShare = () => {
    if (!createdFund) return;
    const randomHook = SHARE_HOOKS[Math.floor(Math.random() * SHARE_HOOKS.length)];
    
    const descText = createdFund.description?.trim()
      ? `💬こだわり:\n${createdFund.description.length > 70 ? createdFund.description.slice(0, 67) + '...' : createdFund.description}\n\n`
      : '';

    const text = `📊「${createdFund.title}」を考えました！\n作成者: @${createdFund.author}\n\n${descText}${randomHook}\n#俺ファンド #株式投資 #ポートフォリオ`;
    const fundUrl = `${window.location.origin}/fund/${createdFund.id}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fundUrl)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    router.push(`/fund/${createdFund.id}`);
  };

  const handleCancelShare = () => {
    if (!createdFund) return;
    router.push(`/fund/${createdFund.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 relative">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer text-left"
        >
          <span className="text-xl">📊</span>
          <h1 className="text-base font-black text-slate-900 tracking-tight">俺ファンド</h1>
        </button>
        <span className="text-xs font-bold text-slate-500">
          {forkId ? 'アレンジ作成' : '新規作成'}
        </span>
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600">投稿者名</label>
                <span className="text-[10px] text-slate-400">名前#パスワード でなりすまし防止</span>
              </div>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="例: 投資太郎#秘密の言葉（空欄ならランダム）"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">🏷️ 生成される名前:</span>
                  <span className="text-xs font-extrabold text-indigo-600 truncate bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    @{previewAuthor || '計算中...'}
                  </span>
                </div>
                {!author && (
                  <button
                    type="button"
                    onClick={refreshRandomSeed}
                    className="text-[10px] bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold px-2 py-1 rounded-lg transition flex-shrink-0 cursor-pointer"
                    title="別のランダム名前に変更"
                  >
                    🎲 引き直す
                  </button>
                )}
              </div>
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
              <div>
                <h2 className="text-sm font-bold text-slate-700">📊 組み入れ銘柄</h2>
                <span className="text-[10px] text-slate-400">※ 証券コード4桁（例: 7203）入力で会社名と前日終値を自動取得</span>
              </div>
              <span className="text-xs font-bold text-indigo-600">
                合計: ¥{totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const isHovered = hoveredIndex === idx;
                const calcItem = calculatedItems[idx];
                const itemRatio = totalAmount > 0 ? Math.floor((calcItem.amount / totalAmount) * 100) : 0;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`p-3 rounded-xl border transition-all duration-150 space-y-2 ${
                      isHovered
                        ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-grow">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <input
                          type="text"
                          placeholder="銘柄名 または 証券コード（例: 7203, トヨタ自動車）"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-500 text-xs px-1 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-[10px] text-slate-500 font-bold">
                            株価 (円)
                          </label>
                          {item.isLoadingPrice ? (
                            <span className="text-[10px] text-indigo-500 animate-pulse font-bold">取得中...</span>
                          ) : item.isAutoPrice ? (
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">🔒 前日終値</span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          step="any"
                          placeholder="例: 2500"
                          value={item.price}
                          readOnly={item.isAutoPrice}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            item.isAutoPrice ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed font-bold' : 'bg-white border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">保有株数</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="例: 10"
                          value={item.shares}
                          onChange={(e) => handleItemChange(idx, 'shares', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    <div className="h-4 flex items-center justify-end text-[11px] font-bold text-slate-500">
                      {calcItem.amount > 0 ? (
                        <span>
                          金額: ¥{calcItem.amount.toLocaleString()} ({itemRatio}%)
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">未設定</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              ＋ 銘柄を追加する
            </button>
          </div>

          {totalAmount > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  構成プレビュー
                </span>
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
                    {calculatedItems.map((item, idx) => {
                      if (item.amount <= 0) return null;
                      const isHovered = hoveredIndex === idx;
                      const itemRatio = Math.floor((item.amount / totalAmount) * 100);

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          style={{
                            flexGrow: item.amount,
                            backgroundColor: item.color,
                            minWidth: '18px',
                            transform: isHovered ? 'scaleY(1.22)' : 'scaleY(1)',
                            boxShadow: isHovered ? `0 0 12px ${item.color}` : 'none',
                            filter: isHovered ? 'brightness(1.12)' : 'brightness(1)',
                            zIndex: isHovered ? 10 : 1,
                          }}
                          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden shrink-0"
                          title={`${item.name}: ${itemRatio}%`}
                        >
                          {itemRatio >= 8 && (
                            <span className="text-[11px] font-black text-white drop-shadow-xs truncate px-1 select-none">
                              {itemRatio}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-7 mt-2 flex items-center justify-center text-xs">
                    {hoveredIndex !== null && calculatedItems[hoveredIndex]?.amount > 0 ? (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: calculatedItems[hoveredIndex].color }}
                        />
                        <span className="font-bold text-slate-800">
                          {calculatedItems[hoveredIndex].name}
                        </span>
                        <span className="font-black text-indigo-600">
                          {Math.floor((calculatedItems[hoveredIndex].amount / totalAmount) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">バーに触れると詳細が表示されます</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {calculatedItems.map((item, idx) => {
                        if (item.amount <= 0) return null;
                        const sliceAngle = (item.amount / totalAmount) * 360;
                        const safeAngle = sliceAngle >= 360 ? 359.99 : sliceAngle;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + safeAngle;
                        currentAngle += safeAngle;

                        const isHovered = hoveredIndex === idx;
                        const outerR = isHovered ? 92 : 86;
                        const innerR = 48;

                        return (
                          <path
                            key={idx}
                            d={getDonutSlicePath(100, 100, outerR, innerR, startAngle, endAngle)}
                            fill={item.color}
                            className="transition-all duration-150 cursor-pointer"
                            style={{
                              opacity: hoveredIndex !== null && !isHovered ? 0.35 : 1,
                            }}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        );
                      })}
                      <circle
                        cx="100"
                        cy="100"
                        r="47"
                        fill="transparent"
                        className="cursor-default"
                        onMouseEnter={() => setHoveredIndex(null)}
                      />
                    </svg>
                  </div>

                  <div className="h-7 mt-2 flex items-center justify-center text-xs">
                    {hoveredIndex !== null && calculatedItems[hoveredIndex]?.amount > 0 ? (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: calculatedItems[hoveredIndex].color }}
                        />
                        <span className="font-bold text-slate-800">
                          {calculatedItems[hoveredIndex].name}
                        </span>
                        <span className="font-black text-indigo-600">
                          {Math.floor((calculatedItems[hoveredIndex].amount / totalAmount) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">銘柄またはグラフに触れると詳細が表示されます</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md transition text-sm active:scale-98 cursor-pointer"
          >
            {isSubmitting ? '作成中...' : '🚀 ファンドを公開する'}
          </button>
        </form>
      </main>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-slate-100">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              🎉
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                ファンドを作成しました！
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                今すぐX（Twitter）に投稿して、みんなにポートフォリオを見てもらいますか？
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmShare}
                className="w-full py-3 px-4 bg-black hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>𝕏 で今すぐ投稿する（はい）</span>
              </button>

              <button
                type="button"
                onClick={handleCancelShare}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition active:scale-95 cursor-pointer"
              >
                あとで（詳細を見る）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateFundPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">読み込み中...</div>}>
      <CreateFundContent />
    </Suspense>
  );
}