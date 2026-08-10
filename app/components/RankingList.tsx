"use client";

import { useState } from "react";

// ダミーデータ
const dummyData = {
  popular: [
    { id: 1, title: "大谷CM採用企業ポートフォリオ", score: "42 おもしろ！" },
    { id: 2, title: "深夜のラーメン＆サウナ欲望全振ファンド", score: "28 おもしろ！" },
    { id: 3, title: "オルカン一括＆暗号資産スパイス", score: "15 おもしろ！" },
  ],
  trending: [
    { id: 2, title: "深夜のラーメン＆サウナ欲望全振ファンド", score: "+150%" },
    { id: 1, title: "大谷CM採用企業ポートフォリオ", score: "+120%" },
    { id: 3, title: "オルカン一括＆暗号資産スパイス", score: "+90%" },
  ],
  weekly: [
    { id: 1, title: "大谷CM採用企業ポートフォリオ", score: "今週 1 位" },
    { id: 3, title: "オルカン一括＆暗号資産スパイス", score: "今週 2 位" },
    { id: 2, title: "深夜のラーメン＆サウナ欲望全振ファンド", score: "今週 3 位" },
  ],
};

type TabType = "popular" | "trending" | "weekly";

export default function RankingList() {
  const [activeTab, setActiveTab] = useState<TabType>("popular");

  return (
    <div className="max-w-xl mx-auto my-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      {/* タブ切り替えボタン */}
      <div className="flex gap-4 border-b border-slate-100 pb-3 mb-4">
        <button
          onClick={() => setActiveTab("popular")}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === "popular"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          🔥 人気
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === "trending"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          🚀 急上昇
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`text-sm font-bold pb-1 transition ${
            activeTab === "weekly"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          🏆 週間ランキング
        </button>
      </div>

      {/* リスト表示 */}
      <div className="space-y-3">
        {dummyData[activeTab].map((item, index) => (
          <a
            key={item.id}
            href={`/fund/${item.id}`}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-decoration-none"
          >
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-sm text-slate-400 w-4 text-center">
                {index + 1}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {item.title}
              </span>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {item.score}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}