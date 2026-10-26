export const sid = (item, loc) => `${item}@${loc}`; // id stok = item@lokasi
export const LOC_NAME = { produksi: 'Unit Produksi', outlet: 'Outlet' };
export const DAY_LABELS = ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'H-1', 'Hari ini'];

// Aman / Rendah (di bawah ambang) / Habis
export const statusOf = (s) => (s.qty <= 0 ? 'empty' : s.qty < s.min ? 'low' : 'ok');
export const worst = (list) => (list.includes('empty') ? 'empty' : list.includes('low') ? 'low' : 'ok');

// Status selalu didampingi ikon + teks (bukan warna saja)
export const STATUS = {
  ok: { label: 'Aman', icon: '✓', chip: 'bg-[#E3F1E1] text-[#1E5B2A] border-[#8CC08C]' },
  low: { label: 'Rendah', icon: '▲', chip: 'bg-[#FFF0D1] text-[#7A4A00] border-[#E09A2B]' },
  empty: { label: 'Habis', icon: '✕', chip: 'bg-marun text-white border-marun' },
};

export const fmtNum = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
export const rupiah = (n) => 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(n));
export const compact = (n) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const fmtTime = (iso) =>
  iso ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : 'Belum ada update (data demo)';