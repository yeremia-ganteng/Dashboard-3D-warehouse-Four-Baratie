// Murni data (tanpa three.js): denah, posisi rak, kamera, jalur simulasi.
// Sumbu: x = kiri-kanan, z = depan (ke arah kamera). Muka bangunan Outlet ada di z = 4.
const prodX = -21; // pusat Unit Produksi
const outX = 5;    // pusat area etalase/konter (rak, etalase, konter tidak bergeser)
const dockX = prodX - 6.2;  // truk parkir di SAMPING kiri Unit Produksi (dok muat)
const parkX = outX - 8.0;   // truk berhenti di samping kiri Outlet, agak jauh dari bangunan

export const SITE = {
  prodX, outX, dockX, parkX,
  padProdX: dockX - 1.2, // pusat area peti di dok muat produksi
  padOutX: parkX - 1.2,  // pusat area peti di dok bongkar samping Outlet
  padZ: 6.9,             // z peti diletakkan
  standZ: 7.6,           // z sopir berdiri saat angkat / taruh peti
  // Jalan membentang di sumbu X. Lalu lintas sisi kiri:
  // lajur "near" (dekat bangunan) arah ke kanan, lajur "far" arah ke kiri.
  road: { x0: prodX - 14, x1: outX + 15, z0: 9.4, z1: 13.4, near: 10.4, mid: 11.4, far: 12.4 },
};

// Bangunan Outlet (diperbesar): lantai, dinding, atap, pintu, bar kopi
export const OUTLET = { x0: 0.9, x1: 15.1, zB: -4.05, zF: 4.0, cx: 8.0, h: 3.7 };
export const DOOR = { x: 11.9, w: 1.8 };               // pintu kaca ganda di muka bangunan (z = zF)
export const BAR = { cx: 12.6, w: 4.2, zC: -1.4, machX: 12.0, workZ: -2.3 }; // Bar Kopi = meja pulau; barista di belakang (z = workZ)

// Bangunan Unit Produksi: dinding kaca, atap, pintu, lampu. (Dinding belakang & lantai ada di Zone, World.jsx)
export const PROD = { cx: prodX, x0: prodX - 4.1, x1: prodX + 4.1, zB: -4.05, zF: 4.0, h: 3.7 };
export const PROD_DOOR = { x: prodX, w: 2.6 };
// Lampu gantung produksi. lit = memakai cahaya titik saat malam (dibatasi 3 agar ringan di HP)
export const PROD_LAMPS = [
  { x: -23.2, z: -1.3, lit: true },  // di atas oven
  { x: -20.4, z: -1.3, lit: false }, // di atas meja adonan
  { x: -17.8, z: -1.3, lit: true },
  { x: -22.2, z: 1.6, lit: false },  // di atas rak
  { x: -19.2, z: 1.6, lit: true },
];

const OCX = OUTLET.cx;
const SPAN = OCX - prodX;
const PD = prodX + 5; // pergeseran dekor Unit Produksi dari koordinat lama (-5)

export const VIEWS = {
  overview: { look: [(prodX + OCX) / 2, 0.4, 4.2], dir: [0.3, 0.85, 1], dist: SPAN * 1.55 + 14 },
  produksi: { look: [prodX - 1.5, 0.5, 1.8], dir: [0.5, 0.8, 1], dist: 19 },
  outlet: { look: [OCX, 0.8, 1.6], dir: [0.2, 0.8, 1], dist: 22 },
  top: { look: [(prodX + OCX) / 2, 0, 4.2], dir: [0, 1, 0.03], dist: SPAN * 1.35 + 14 },
};

export const GROUPS = {
  oven: { name: 'Oven — hasil produksi', loc: 'produksi', pos: [-7.2 + PD, 0.8, -3] },
  etalase: { name: 'Etalase Roti', loc: 'outlet', pos: [5, 0.8, -0.2] },
};

// Kunci = "idItem@lokasi". Item baru di data.json perlu satu baris di sini
// (kalau tidak, item tetap muncul di tabel & panel, hanya tidak ada rak 3D-nya).
export const LAYOUT = {};
const ROTI = ['banana-cake', 'coffee-bun', 'roti-sosis', 'roti-boy-cokelat', 'roti-boy-original', 'roti-boy-keju'];
const BAHAN = ['kopi', 'susu', 'gula-aren', 'sirup-caramel', 'bubuk-taro', 'teh', 'cup'];

// Rak tray roti di Unit Produksi (2 baris x 3)
ROTI.forEach((id, i) => {
  LAYOUT[`${id}@produksi`] = { pos: [-8 + PD + (i % 3) * 1.8, 0, i < 3 ? 0.2 : 2.5], frame: 'rack', plankY: 0.55, width: 1.5, labelY: 1.25 };
});
// Etalase roti di Outlet (6 bay di atas lemari etalase)
ROTI.forEach((id, i) => {
  LAYOUT[`${id}@outlet`] = { pos: [2.25 + i * 1.1, 0, -0.2], frame: 'plate', plankY: 0.72, width: 1.0, labelY: 1.45 + (i % 2) * 0.35 };
});
// Rak bahan minuman di dinding belakang Outlet (label selang-seling agar tidak bertumpuk)
BAHAN.forEach((id, i) => {
  LAYOUT[`${id}@outlet`] = { pos: [1.7 + i * 1.1, 0, -3.55], frame: 'wall', plankY: 1.25, width: 1.0, labelY: 1.95 + (i % 2) * 0.3 };
});

// ---- Meja ----
// Meja dalam Outlet. lit = lampu gantungnya memakai point light saat malam (dibatasi 3 agar ringan di HP)
export const INDOOR = [
  { x: 2.8, z: 3, lit: false }, { x: 5.4, z: 3, lit: true }, { x: 8.0, z: 3, lit: true },
  { x: 13.9, z: 3, lit: true }, { x: 13.9, z: 0.8, lit: false },
];
export const OUT_X = [3.2, 6.4, 9.6, 14.2]; // meja outdoor di halaman (z = OUT_Z); celah x≈11.2-12.6 = jalan ke pintu
export const OUT_Z = 6.8;

// ---- Simulasi pelanggan (Outlet) ----
export const SIM = {
  orderZ: 0.75,                    // z pelanggan saat antre/memesan (di depan etalase)
  laneZ: 1.65,                     // jalur jalan di dalam, di depan antrean
  queueX: [5.0, 5.95, 6.9],        // posisi antrean (maks 3)
  outLaneZ: 5.3,                   // jalur ke meja outdoor di halaman
  doorInX: DOOR.x + 0.35,          // lajur masuk lewat pintu
  doorOutX: DOOR.x - 0.35,         // lajur keluar lewat pintu
  walkZ: 8.8,                      // trotoar depan
  spawnX: 19, exitX: 19,           // pelanggan muncul / pergi di trotoar sisi kanan
  staffZ: -1.05,                   // lorong staf (antara konter dan etalase)
  serveX: 5.0,                     // posisi kasir menyerahkan pesanan
  registerX: 3.4,                  // x mesin kasir
  baristaX: BAR.machX,             // posisi barista (di belakang meja pulau, menghadap pelanggan)
  baristaZ: BAR.workZ,
  baristaLaneX: 9.9,               // lorong di ujung kiri pulau (jalur barista ke kasir)
  cupX: 8.3, cupZ: -2.95,          // rak cup di dinding belakang
};

// ---- Simulasi produksi (Unit Produksi) ----
export const WORK = {
  doughX: -4.4 + PD - 0.5, doughZ: -1.95, // pekerja adonan (berdiri di depan meja adonan)
  pickX: -4.4 + PD + 0.5, pickZ: -1.95,   // titik pembakar mengambil adonan
  ovenX: -7.2 + PD, ovenZ: -1.85,         // titik pembakar di depan oven
  laneZ: -1.15, corridorX: -18.6,         // jalur jalan supaya tidak menembus meja / rak
  batch: 8,                               // roti per loyang (parameter simulasi, DATA DEMO)
  bakeTime: 5,                            // detik menunggu matang (parameter simulasi)
};

// ---- Pengiriman otomatis ----
// trigger: 'empty' = berangkat saat ada stok Outlet HABIS; 'low' = saat sudah RENDAH
export const AUTO = { trigger: 'low', cooldown: 15 };

// ---- Pekerja pengantar peti (Unit Produksi -> Dok Muat), lewat PINTU DEPAN ----
// Rak baris depan (z = 2.5) diambil dari sisi depannya (z = pickZ), supaya tidak berpapasan dengan
// pembakar yang memakai lorong antar-baris rak (z 1.1-1.6) dan lorong x = WORK.corridorX.
export const HAUL = {
  homeX: prodX + 3.0, homeZ: 3.4,                  // titik siaga di dalam Produksi (depan kanan)
  pickX: [2, 1, 0].map((c) => -8 + PD + c * 1.8),  // x rak baris depan, dari yang terdekat pintu (harus sama dgn LAYOUT di atas)
  pickZ: 2.5 + 0.9,                                // berdiri di depan rak baris depan, menghadap ke belakang
  outZ: PROD.zF + 0.95,                            // titik di luar pintu (di bawah teritisan)
  yardZ: 7.05,                                     // jalur lurus menuju dok muat
  dropDX: 1.7,                                     // berdiri di kanan tumpukan peti (jarak x dari pusat dok)
  doorRange: 2.6,                                  // pintu mulai membuka bila pengguna sejauh ini dari pintu
  speed: 1.9,                                      // kecepatan jalan pekerja pengantar (unit/detik)
};


// ---- Pegawai penerima peti di Outlet (dok bongkar samping -> pintu depan Outlet) ----
// Lajur x = DOOR.x lurus melewati celah pot tanaman (x 11.2-12.6) menuju pintu kaca.
export const RECV = {
  x: DOOR.x,                // lajur lurus di tengah celah pintu
  inZ: 2.4,                 // titik di dalam Outlet: pegawai muncul & menaruh peti
  outZ: OUTLET.zF + 0.9,    // titik di luar pintu
  walkZ: SIM.walkZ,         // trotoar depan (z 8.8), bebas dari pot tanaman (z 8.0)
  doorRange: 2.8,           // pintu mulai membuka bila pegawai sejauh ini dari pintu
  speed: 2.1,               // kecepatan jalan (unit/detik)
};

// ---- Dua stasiun kasir di Outlet ----
// Lorong staf (z = SIM.staffZ) hanya muat satu orang, jadi tiap kasir punya zona x sendiri yang tidak
// saling tumpang-tindih: tidak ada kasir yang perlu melewati kasir lain.
//   registerX : x mesin kasir (dunia). Harus = 5 + posisi x <Register> di objects/Counter.jsx
//   serveX    : tempat kasir berdiri menyerahkan pesanan = x kepala antrean
//   queueX    : posisi antre (kepala dulu); antrean memanjang menjauhi stasiun lain
//   zone      : rentang x etalase yang boleh diambil kasir ini (bay roti: 2.25, 3.35, 4.45 | 5.55, 6.65, 7.75)
//   drinks    : true = stasiun ini yang berhubungan dengan barista (melayani pesanan berisi minuman)
export const STATIONS = [
  { id: 'roti', name: 'Kasir 1', registerX: 3.4, serveX: 4.6, queueX: [4.6, 3.65, 2.7], zone: [2.0, 5.0], drinks: true },
  { id: 'kopi', name: 'Kasir 2', registerX: 6.4, serveX: 6.4, queueX: [6.4, 7.35, 8.3], zone: [5.2, 8.2], drinks: true },
];


// ---- Lajur jalan (tiap arah punya lajur sendiri, supaya tidak berhadapan) ----
// inE/inW = di dalam Outlet (arah timur/kanan, arah barat/kiri); yardE/yardW = halaman;
// walkW = trotoar arah barat (menuju pintu / dok bongkar); walkE = trotoar arah timur (pergi).
// recvX/recvZ = titik muncul & menaruh peti pegawai penerima (di samping lajur pelanggan).
export const LANES = {
  inE: 1.4, inW: 2.15,
  yardE: 5.0, yardW: 5.65,
  walkW: 8.55, walkE: 9.1,
  recvX: 10.4, recvZ: 2.9,
};

// ---- Sensor pintu Outlet ----
// minPeople : jumlah orang (menuju pintu) yang membuat pintu terbuka OTOMATIS
// range     : jangkauan sensor dari pintu
// pushRange : satu orang saja membuka pintu setelah sedekat ini (mendorong). 0 = pelanggan tunggal menembus pintu
// holdMs    : pintu ditahan terbuka sesudah pemicu terakhir
export const DOORSENS = { minPeople: 2, range: 2.4, pushRange: 1.5, holdMs: 700 };


// ---- Lampu Outlet (dalam + halaman). Koordinat dunia ----
// spots   : lampu sorot gantung di dalam Outlet [x, z]; spotY = tinggi lampu; poolR/glow = bercak cahaya di lantai (malam)
// point   : cahaya titik SUNGGUHAN (i = intensitas, d = jangkauan). lit:false = matikan. Tidak aktif di mode `low`
// yard    : lampu untai halaman (tiang teritisan -> dua tiang baru); pools = bercak cahaya [x, z, radius]
// bollards: lampu taman kecil di celah antar pot
export const OUTLET_LIGHTS = {
  spotY: 3.0,
  poolR: 1.6,
  glow: 0.08,
  spots: [
    [2.6, -3.0], [4.9, -3.0], [7.2, -3.0], [9.5, -3.0], [11.8, -3.0], [14.0, -3.0], // atas rak bahan & konter
    [2.6, -0.1], [4.9, -0.1], [7.2, -0.1], [11.0, -0.1], [13.4, -0.1],              // atas etalase & Bar Kopi
    [3.0, 1.7], [5.6, 1.7], [8.2, 1.7], [10.8, 1.7], [13.4, 1.7],                   // atas lorong pelanggan
  ],
  point: [
    { x: 5.0, y: 3.0, z: -0.6, i: 60, d: 13, lit: true }, // atas konter & etalase
    { x: 12.4, y: 3.0, z: -0.6, i: 55, d: 12, lit: true }, // atas Bar Kopi
  ],
  yard: {
    postX: [OUTLET.x0 - 0.12, OUTLET.x1 + 0.12], postZ: OUTLET.zF + 0.52, postY: 3.35, // tiang teritisan (dari Building.jsx)
    poleX: [OUTLET.x0 + 0.3, OUTLET.x1 + 0.1], poleZ: 7.5, topY: 3.4,                  // dua tiang baru
    sag: 0.4, bulbEvery: 0.9,
    pools: [[3.2, 6.6, 2.0], [6.4, 6.6, 2.0], [9.6, 6.6, 2.0], [14.2, 6.6, 2.0], [DOOR.x, 5.3, 2.2]],
  },
  bollards: { x: [2.35, 5.35, 8.35, 13.95], z: 8.0, poolR: 1.1 },
};


// ---- Jalur pejalan kaki (overlay transparan, murni visual) ----
// front/back : rentang z trotoar (sama dengan mesh trotoar di Site.jsx: z 8.8 lebar 1.2 | z 14.1 lebar 1.4)
// court      : jalur halaman -> pintu Outlet (celah antar pot, berakhir di keset pintu)
// y / courtY : tinggi overlay (permukaan trotoar = 0.06, halaman = 0). Naikkan sedikit bila tertutup
// step       : jarak antar panah (unit)
// style      : warna + opasitas. Ganti band ke '#B07A3A' bila ingin nuansa perunggu/krem, bukan hijau
export const WALKWAY = {
  front: { z0: 8.2, z1: 9.4 },
  back: { z0: 13.4, z1: 14.8 },
  showBack: true,
  court: { x: DOOR.x, w: 1.3, z0: 5.15, z1: 8.2 },
  y: 0.066,
  courtY: 0.016,
  step: 2.2,
  style: {
    band: '#6FA06A', bandOp: 0.2,   // warna dasar jalur
    edge: '#B07A3A', edgeOp: 0.4,   // garis tepi
    mark: '#F8F1E7', markOp: 0.6,   // panah arah
    dot: '#B07A3A', dotOp: 0.5,     // titik taktil di ujung zebra
    nightK: 0.75,                   // pengali opasitas saat malam
  },
};


// ---- Jam simulasi & jam sibuk (DATA DEMO, parameter simulasi) ----
// secPerHour  : detik nyata per 1 jam simulasi
// closedSpeed : pengali kecepatan jam saat tutup (supaya malam tidak terasa lama)
// start       : jam mulai saat halaman dibuka | open/close : jam buka & tutup
// nightFrom/To: rentang malam untuk opsi "Ikut jam"
// profile     : k = pengali laju kedatangan (1 = normal; interval dasar rand(8,15) detik di Customers.jsx)
export const CLOCK = {
  secPerHour: 30,
  closedSpeed: 10,
  start: 7, open: 7, close: 21,
  nightFrom: 18, nightTo: 6,
  profile: [
    { from: 7, to: 9, k: 2.2, level: 'ramai' },
    { from: 9, to: 11, k: 1.2, level: 'normal' },
    { from: 11, to: 14, k: 0.6, level: 'sepi' },
    { from: 14, to: 16, k: 0.9, level: 'normal' },
    { from: 16, to: 19, k: 2.0, level: 'ramai' },
    { from: 19, to: 21, k: 0.8, level: 'normal' },
  ],
};


// ---- Meja ambil minuman di Bar Kopi (tahap 3a) ----
// stand = tempat pelanggan berdiri (di depan pulau) | cup = posisi gelas di atas meja | topY = permukaan meja pulau
// Dua slot = maksimal dua minuman siap/diproses sekaligus; pesanan ketiga menunggu di kepala antrean.
export const PICKUP = {
  slots: [
    { stand: [10.55, -0.45], cup: [10.5, -1.02] },  // ujung kiri pulau (kubah roti sudah digeser ke kanan)
    { stand: [12.0, -0.45], cup: [12.0, -1.02] },   // di antara bangku bar 1 dan 2
  ],
  topY: 1.08,
};

// ---- Gudang Outlet: bangunan kecil di sebelah kanan dok bongkar (di luar Outlet), pintu di dinding selatan ----
// x0..x1 / z0..z1 = tapak | doorX/doorW = pintu di dinding selatan (z = z1), menghadap trotoar
// inX/inZ = titik siaga di dalam dekat pintu | placeZ = tempat berdiri saat menaruh peti | h = tinggi dinding
export const GUDANG = {
  x0: -1.6, x1: 0.4, z0: 5.4, z1: 8.0,
  doorX: -0.6, doorW: 1.0,
  inX: -0.6, inZ: 7.1, placeZ: 6.75,
  h: 2.3,
};

// ---- Lalu lintas sekitar: kendaraan lain, penyeberang, ojol (tahap 3b, dekor DATA DEMO) ----
// laneZ     : lajur kendaraan lain (lajur seberang, arah barat/kiri layar). Lajur dekat = lajur truk pengantar
// zebraX    : pusat zebra cross (sama dengan Site.jsx)
// stopDX    : garis berhenti kendaraan = zebraX + stopDX | clearAhead = jarak "aman" sebelum pejalan boleh melangkah
// ped       : span = jarak asal/tujuan pejalan dari zebra | walkF/walkB = jalur di trotoar depan/belakang
//             curbF/curbB = titik tunggu di tepi jalan | laneGo/laneBack = lajur menyeberang (selisih x dari zebraX)
// ojol      : park = tempat parkir motor | dismount = tempat kurir turun
//             shelf = meja pickup (di dalam, kiri pintu) | stand = tempat kurir berdiri mengambil
export const TRAFFIC = {
  laneZ: SITE.road.far,
  startX: SITE.road.x1 - 0.2, endX: SITE.road.x0 + 0.2,
  zebraX: (SITE.padProdX + SITE.padOutX) / 2,
  stopDX: 2.6,
  clearAhead: 6.5,
  maxCars: 2, maxPeds: 2,
  carEvery: [8, 16], pedEvery: [16, 30], ojolEvery: [55, 95],   // detik antar kemunculan (tutup: lebih jarang)
  carSpeed: [3.2, 4.6], motorSpeed: [4.0, 5.4],
  accel: 3.0, decel: 6.0, stopGap: 0.5, spawnGap: 9,
  ped: { span: 11, walkF: 8.75, walkB: 13.75, curbF: 9.2, curbB: 13.6, laneGo: -0.5, laneBack: 0.5 },
  ojol: {
    park: [12.3, 9.85],
    dismount: [12.75, 9.25],
    shelf: [10.1, 3.6],
    stand: [10.1, 2.95],
  },
};


// ---- Tur kamera otomatis + penjelasan (tahap 4, diperluas) ----
// id    : kunci penjelasan di scene/tourScript.js
// zone  : area hanya dipakai bila peran boleh melihat zona itu (null = semua peran)
// view  : kunci VIEWS (menyorot tombol kamera) | secs = lama minimum di area itu (di luar 1,1 dtk waktu terbang)
// pace  : lama tampil = max(secs, base + jumlah kata x perWord) detik. Naikkan perWord bila terlalu cepat dibaca
const ZX_TOUR = (SITE.padProdX + SITE.padOutX) / 2;
export const TOUR = {
  pace: { base: 4, perWord: 0.28 },
  steps: [
    { id: 'overview', label: 'Seluruh area', view: 'overview', ...VIEWS.overview, zone: null, secs: 6 },
    { id: 'produksi', label: 'Unit Produksi', view: 'produksi', ...VIEWS.produksi, zone: 'produksi', secs: 6 },
    { id: 'dokmuat', label: 'Dok muat', look: [SITE.padProdX + 0.4, 0.6, 6.8], dir: [0.5, 0.6, 1], dist: 13, zone: 'produksi', secs: 5 },
    { id: 'jalur', label: 'Jalur pengiriman', look: [ZX_TOUR, 0.2, 10], dir: [0.3, 0.7, 1], dist: 21, zone: null, secs: 5 },
    { id: 'dokbongkar', label: 'Dok bongkar', look: [SITE.padOutX, 0.6, 6.8], dir: [0.4, 0.6, 1], dist: 12, zone: 'outlet', secs: 5 },
    { id: 'gudang', label: 'Gudang', look: [(GUDANG.x0 + GUDANG.x1) / 2, 0.8, (GUDANG.z0 + GUDANG.z1) / 2], dir: [0.4, 0.6, 1], dist: 11, zone: 'outlet', secs: 5 },
    { id: 'outlet', label: 'Outlet', view: 'outlet', ...VIEWS.outlet, zone: 'outlet', secs: 6 },
    { id: 'kasir', label: 'Kasir & pembayaran', look: [5, 1.0, -1.6], dir: [0.15, 0.75, 1], dist: 10, zone: 'outlet', secs: 6 },
    { id: 'bar', label: 'Bar Kopi', look: [12.6, 1.0, -1.2], dir: [0.15, 0.7, 1], dist: 9.5, zone: 'outlet', secs: 6 },
    { id: 'restock', label: 'Pengisian rak', look: [8.5, 1.0, -1.8], dir: [0.1, 1, 0.5], dist: 12, zone: 'outlet', secs: 6 },
    { id: 'halaman', label: 'Halaman Outlet', look: [8.2, 0.5, 6.5], dir: [0.1, 0.55, 1], dist: 16, zone: 'outlet', secs: 5 },
    { id: 'atas', label: 'Tampak atas', view: 'top', ...VIEWS.top, zone: null, secs: 6 },
  ],
};


// ---- Metode pembayaran (simulasi, DATA DEMO) & kamera POV ----
// mix            : peluang tiap metode dipilih pelanggan (dinormalkan otomatis; angka ini ASUMSI, bukan data bisnis)
// bills          : pecahan uang tunai | nextBillChance : peluang membayar dengan pecahan satu tingkat di atas yang pas
// chooseSecs     : lama kasir bertanya & pelanggan memilih metode
// POV.eyeUp/fwd  : tinggi mata dari pinggul & geser ke depan | pitch = sudut menunduk (rad)
export const PAYMENT = {
  mix: { tunai: 0.3, qris: 0.5, kartu: 0.2 },
  bills: [5000, 10000, 20000, 50000, 100000],
  nextBillChance: 0.3,
  chooseSecs: 1.4,
};
export const POV = {
  fov: 62, near: 0.1,
  eyeUp: 0.7, fwd: 0.1,
  pitchCashier: -0.2, pitchCustomer: -0.12,
  wait: { pos: [DOOR.x, 1.65, OUTLET.zF + 2.2], look: [8, 1.3, -1.5] }, // pandangan bila belum ada pelanggan
};


// ---- Pegawai pengisi rak: gudang (sebelah dok bongkar) -> rak Outlet ----
// lane       : x lorong ujung kiri pulau Bar Kopi (jalan ke lorong staf & lorong belakang konter)
// breadStop  : tempat berdiri saat mengisi etalase roti (sisi kanan etalase, di lorong staf)
// suppliesStop: tempat berdiri saat mengisi rak bahan (lorong belakang konter, menghadap dinding belakang)
// startDelay : jeda sejak peti diletakkan di gudang sampai pegawai berangkat (detik)
export const RESTOCK = {
  speed: 2.0,
  startDelay: 2.5,
  lane: 9.9,
  breadStop: [8.9, SIM.staffZ],
  suppliesStop: [5.0, -3.0],
};