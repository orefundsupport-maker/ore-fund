{/* 1本の横棒スタックバー（帯グラフ） */}
<div className="py-2">
  <div className="h-8 w-full rounded-full overflow-hidden flex bg-slate-100 shadow-inner p-1 gap-1 items-center">
    {displayItems.map((item, idx) => {
      const isHovered = activeHoveredItem?.name === item.name;
      const widthPercent = (item.weight / weightTotal) * 100;
      if (widthPercent <= 0) return null;

      return (
        <div
          key={idx}
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
          style={{
            flexGrow: item.weight,
            backgroundColor: item.color,
            minWidth: '16px', // 👈 細小銘柄でも最低16pxのタップ領域を確保
            transform: isHovered ? 'scaleY(1.25)' : 'scaleY(1)',
            boxShadow: isHovered ? `0 0 12px ${item.color}` : 'none',
            filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
            zIndex: isHovered ? 10 : 1,
          }}
          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden shrink-0"
          title={`${item.name}: ${item.displayRatio}%`}
        >
          {/* 比率が十分大きい時だけバー内に%を表示 */}
          {item.displayRatio >= 8 && (
            <span className="text-[10px] font-black text-white drop-shadow-xs truncate px-1 select-none">
              {item.displayRatio}%
            </span>
          )}
        </div>
      );
    })}
  </div>

  {/* ホバー時の詳細ポップアップ */}
  <div className="h-7 mt-1.5 flex items-center justify-center">
    {activeHoveredItem ? (
      <div className="flex items-center gap-2 bg-white px-3.5 py-1 rounded-full border border-slate-200 shadow-xs text-xs animate-fade-in">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: activeHoveredItem.color }}
        />
        <span className="font-bold text-slate-800">{activeHoveredItem.name}</span>
        <span className="font-black text-indigo-600">{activeHoveredItem.ratio}%</span>
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