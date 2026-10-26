// Logo bulat hitam (placeholder). Ganti isi dengan <img src="/logo-asli.svg"> bila sudah ada.
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Logo Four É Baratie">
      <circle cx="256" cy="256" r="256" fill="#111" />
      <circle cx="256" cy="256" r="232" fill="none" stroke="#B07A3A" strokeWidth="5" />
      <text x="256" y="238" textAnchor="middle" fontFamily="'Playfair Display',Georgia,serif" fontSize="78" fontWeight="700" fill="#F8F1E7" letterSpacing="6">FOUR É</text>
      <text x="256" y="320" textAnchor="middle" fontFamily="'Playfair Display',Georgia,serif" fontSize="62" fill="#B07A3A" letterSpacing="8">BARATIE</text>
    </svg>
  );
}