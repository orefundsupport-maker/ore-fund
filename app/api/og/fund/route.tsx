{/* 1本バー本体 */}
<div
  style={{
    display: 'flex',
    width: '100%',
    height: '42px',
    backgroundColor: '#1e293b',
    borderRadius: '9999px',
    overflow: 'hidden',
    padding: '3px',
    gap: '2px',
  }}
>
  {calculatedItems.map((item, idx) => (
    <div
      key={idx}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: Math.max(item.percent, 3),
        minWidth: '24px', // 👈 画像上でも潰れない幅
        height: '100%',
        backgroundColor: item.color,
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 900,
        overflow: 'hidden',
        borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === calculatedItems.length - 1 ? '0 9999px 9999px 0' : '0',
      }}
    >
      {item.percent >= 8 ? `${item.percent}%` : ''}
    </div>
  ))}
</div>