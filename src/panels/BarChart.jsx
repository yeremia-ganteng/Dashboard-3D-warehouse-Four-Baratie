import { compact } from '../store/helpers.js';

// Grafik batang SVG sederhana (tanpa library). Bar terakhir = marun (hari/bulan ini).
export default function BarChart({ values, labels, fmt = compact, height = 140, label }) {
  const W = 300, pad = 22, bw = (W - 16) / values.length;
  const max = Math.max(...values, 1);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={label}>
      <line x1="8" x2={W - 8} y1={height - pad} y2={height - pad} stroke="#B07A3A" strokeOpacity=".5" />
      {values.map((v, i) => {
        const h = Math.max(2, ((height - pad - 20) * v) / max);
        const x = 8 + i * bw;
        return (
          <g key={i}>
            <rect x={x + 4} y={height - pad - h} width={bw - 8} height={h} rx="4" fill={i === values.length - 1 ? '#6B1F23' : '#B07A3A'} />
            <text x={x + bw / 2} y={height - pad - h - 4} textAnchor="middle" fontSize="9" fill="#111">{fmt(v)}</text>
            <text x={x + bw / 2} y={height - 7} textAnchor="middle" fontSize="9" fill="#555">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}