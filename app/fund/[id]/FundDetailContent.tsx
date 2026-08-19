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
          minWidth: '18px', // 👈 触りやすい最小幅
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