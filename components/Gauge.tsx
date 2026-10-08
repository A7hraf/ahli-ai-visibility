// Semicircle gauge for the 0–100 visibility score (server-rendered SVG)
export default function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 80;
  const cx = 100;
  const cy = 96;
  const angle = Math.PI * (1 - v / 100);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const large = 0;
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" role="img" aria-label={`${label}: ${v}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#7FB2D9" />
          <stop offset="100%" stopColor="#CDBE5E" />
        </linearGradient>
      </defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round" />
      {v > 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" />}
      <circle cx={x} cy={y} r="7" fill="#fff" stroke="#CDBE5E" strokeWidth="3" />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize="40" fontWeight="700" fill="#fff" fontFamily="Rubik, sans-serif">{v}</text>
      <text x={cx - r} y={cy + 18} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.6)">0</text>
      <text x={cx + r} y={cy + 18} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.6)">100</text>
    </svg>
  );
}
