import { WORK, AUTO, DOORSENS, CLOCK } from './layout.js';

// Teks penjelasan tiap area tur (kunci = id di layout.js -> TOUR.steps).
// lead = ringkasan satu kalimat | points = poin cara kerja. Angka diambil dari konstanta supaya tidak basi.
// Isinya menjelaskan SIMULASI (DATA DEMO), bukan data bisnis. Ubah teks di sini bila alur berubah.
const pad = (n) => String(n).padStart(2, '0');
const trig = AUTO.trigger === 'low' ? 'rendah atau habis' : 'habis';

export const TOUR_TEXT = {
  overview: {
    title: 'Gambaran umum',
    lead: 'Dua tempat kerja yang dihubungkan satu jalur pengiriman.',
    points: [
      'Unit Produksi (kiri) memanggang roti. Outlet (kanan) menjual roti dan minuman.',
      'Truk membawa roti dari Produksi ke Outlet lewat jalan di depan, dengan satu dok di tiap sisi.',
      'Semua yang bergerak adalah simulasi (DATA DEMO). Angka stok di rak berubah mengikuti kejadian ini.',
      'Label di rak menunjukkan stok. Saat kamera jauh, hanya item rendah atau habis yang tampil.',
    ],
  },
  produksi: {
    title: 'Unit Produksi',
    lead: 'Di sinilah roti dibuat dan stok Produksi bertambah.',
    points: [
      'Satu pekerja menguleni adonan. Pembakar mengambil adonan, memasukkannya ke oven, lalu menunggu matang. Bar progres muncul di atas oven.',
      `Roti yang matang diletakkan di rak. Saat itu stok Produksi bertambah hingga ${WORK.batch} roti (satu loyang), untuk roti yang stoknya paling kosong.`,
      `Ukuran loyang dan lama panggang (${WORK.bakeTime} detik) adalah parameter simulasi, bukan data produksi asli.`,
      'Warna strip rak menunjukkan status: marun aman, emas rendah, abu habis.',
    ],
  },
  dokmuat: {
    title: 'Dok muat',
    lead: 'Tempat roti diserahkan ke truk.',
    points: [
      'Saat pengiriman dimulai, pekerja Produksi mengambil peti dari rak, keluar lewat pintu depan (pintu membuka otomatis), dan menaruhnya di dok.',
      'Sopir menunggu di samping truk, lalu memuat peti ke truk.',
      'Peti roti berwarna kuning dan cokelat. Peti bahan berwarna biru-abu.',
      'Bahan minuman berasal dari gudang pusat yang diasumsikan tak terbatas (DATA DEMO), jadi peti bahan sudah ada di dok.',
    ],
  },
  jalur: {
    title: 'Jalur pengiriman',
    lead: `Truk berangkat otomatis saat stok Outlet ${trig}.`,
    points: [
      `Sistem memeriksa stok Outlet tiap beberapa detik. Bila ada item ${trig} dan Produksi bisa memasoknya, truk berangkat (jeda minimal ${AUTO.cooldown} detik).`,
      'Tombol Kirim Stok ke Outlet menjalankan alur yang sama secara manual.',
      'Kendaraan lain dan pejalan di zebra cross hanya dekor. Truk tetap didahulukan: pejalan menunggu saat truk di jalan.',
      'Setelah membongkar, truk menunggu jalan sepi (paling lama 25 detik), memutar balik, dan kembali ke dok muat.',
    ],
  },
  dokbongkar: {
    title: 'Dok bongkar',
    lead: 'Tempat truk menurunkan muatan di samping Outlet.',
    points: [
      'Sopir mengangkat peti dari truk dan menaruhnya di dok.',
      'Saat peti diturunkan, stok Unit Produksi berkurang sesuai muatan.',
      'Stok Outlet belum naik di sini. Barang menunggu di gudang, lalu dimasukkan ke rak.',
      'Pengiriman otomatis adalah data simulasi dan tidak dikirim ke backend. Hanya aksi manual yang dicatat.',
    ],
  },
  gudang: {
    title: 'Gudang Outlet',
    lead: 'Penyangga antara dok bongkar dan rak Outlet.',
    points: [
      'Pegawai penerima keluar dari pintu gudang, mengambil peti di dok bongkar, dan menaruhnya di palet gudang.',
      'Label GUDANG menampilkan kiriman yang menunggu, misalnya jumlah roti dan bahan.',
      'Gudang hanya berisi kiriman truk. Data tidak punya stok gudang sendiri, jadi tidak ada angka stok gudang yang dikarang.',
      'Setelah peti diletakkan, pegawai pengisi rak diberi tahu untuk mengambilnya.',
    ],
  },
  outlet: {
    title: 'Outlet',
    lead: 'Pelanggan datang, antre, dilayani, lalu pergi.',
    points: [
      'Pelanggan masuk lewat pintu kaca dan memilih antrean terpendek dari dua kasir. Tiap arah jalan punya lajur sendiri, dan orang saling mengerem agar tidak bertabrakan.',
      `Pintu membuka otomatis bila ${DOORSENS.minPeople} orang atau lebih menuju pintu, atau satu orang yang sudah sangat dekat.`,
      `Laju kedatangan mengikuti jam simulasi: ramai pagi dan sore, sepi siang, dan tutup di luar ${pad(CLOCK.open)}.00 sampai ${pad(CLOCK.close)}.00. Jamnya tampil di bagian atas.`,
      'Waktu tunggu dan tingkat sibuk kasir tercatat di kartu Kinerja kasir (DATA DEMO).',
    ],
  },
  kasir: {
    title: 'Kasir dan pembayaran',
    lead: 'Pelanggan memilih tunai, QRIS, atau kartu secara otomatis, dan kasir menerimanya sesuai pilihan.',
    points: [
      'Kasir menyebut total lalu bertanya metode bayar. Proporsi metode adalah asumsi simulasi (DATA DEMO).',
      'Tunai: ada uang yang diserahkan dan kembalian. QRIS: pelanggan scan lalu notifikasi masuk. Kartu: tap di mesin EDC lalu disetujui.',
      'Setelah bayar, kasir mengambil roti dari etalase di zonanya dan menyerahkannya. Pesanan minuman diteruskan ke barista.',
      'Coba tombol POV Kasir atau POV Pelanggan untuk melihat langsung dari sudut pandang mereka.',
    ],
  },
  bar: {
    title: 'Bar Kopi',
    lead: 'Minuman diambil pelanggan sendiri di meja bar.',
    points: [
      'Setelah bayar, barista mengambil cup, menyeduh, lalu menaruh gelas di cincin emas di meja. Bahan resep berkurang saat penyeduhan selesai.',
      'Isi gelas berwarna sesuai varian. Varian dan takaran adalah contoh (DATA DEMO).',
      'Ada dua tempat ambil. Bila keduanya terisi, pesanan minuman berikutnya menunggu di kepala antrean.',
      'Pelanggan yang menunggu lebih dari 45 detik pergi tanpa minuman.',
    ],
  },
  restock: {
    title: 'Pengisian rak',
    lead: 'Barang dari gudang masuk ke rak, dan baru saat itu stok Outlet naik.',
    points: [
      'Pegawai pengisi mengambil peti dari gudang, lewat trotoar, dan masuk melalui pintu depan Outlet.',
      'Ia menuju lorong staf di ujung kiri bar, mengisi etalase roti, lalu rak bahan di belakang konter (bila ada muatannya).',
      'Angka stok Outlet naik tepat saat peti ditaruh di rak.',
      'Selesai, ia pulang lewat lajur keluar dan kembali ke gudang.',
    ],
  },
  halaman: {
    title: 'Halaman depan',
    lead: 'Tempat makan di luar, jalur pejalan, dan lalu lintas sekitar.',
    points: [
      'Pelanggan yang makan di tempat duduk di meja dalam atau halaman. Setelah pergi, piring bekas tertinggal dan meja itu tidak bisa dipakai sampai dibersihkan.',
      'Petugas kebersihan berangkat dari gudang dan membereskan hingga tiga meja per perjalanan.',
      'Jalur hijau transparan dan panah menandai arah jalan pejalan.',
      'Sesekali kurir ojol datang mengambil paper bag di meja pickup. Itu hanya visual dan tidak mengubah stok atau omzet (DATA DEMO).',
    ],
  },
  atas: {
    title: 'Tampak atas',
    lead: 'Seluruh alur dalam satu pandangan.',
    points: [
      'Pakai tombol Atap: Sembunyi untuk melihat isi bangunan.',
      'Tombol Fokus ke masalah (muncul bila ada stok rendah atau habis) menerbangkan kamera ke item itu dan membuka panel detail.',
      'Kartu di panel kanan merangkum penjualan, kinerja kasir, dan metode pembayaran. Semuanya DATA DEMO.',
      'Ini area terakhir. Tur selesai setelah ini.',
    ],
  },
};