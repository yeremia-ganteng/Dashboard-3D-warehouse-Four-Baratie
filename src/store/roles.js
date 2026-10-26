// Hak akses per peran (FR-11). Ubah di sini jika aturan berubah.
export const ROLES = {
  owner: { label: 'Owner', zones: ['produksi', 'outlet'], sales: true, forms: ['produksi', 'outlet', 'transaksi'], canSend: true, home: 'overview' },
  staf_outlet: { label: 'Staf Outlet', zones: ['outlet'], sales: false, forms: ['outlet', 'transaksi'], canSend: false, home: 'outlet' },
  staf_produksi: { label: 'Staf Unit Produksi', zones: ['produksi'], sales: false, forms: ['produksi'], canSend: true, home: 'produksi' },
};
export const canSeeLoc = (user, loc) => !!user && ROLES[user.role].zones.includes(loc);