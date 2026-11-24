# Ringkasan Proyek Laundry Kinclong

Dokumen ini merangkum fitur dan struktur yang sudah terlihat di repository saat ini. Aplikasi ini adalah sistem kasir dan manajemen operasional laundry berbasis web untuk pemilik dan kasir.

## Gambaran umum

- **Framework:** Next.js 16 dengan App Router, React 19, dan TypeScript.
- **Styling:** Tailwind CSS 4.
- **Backend dan autentikasi:** Supabase melalui `@supabase/ssr` dan `@supabase/supabase-js`.
- **Ikon:** Lucide React.
- **Bahasa antarmuka:** Bahasa Indonesia.
- **Fungsi utama:** Mengelola layanan, transaksi, antrean dan status cucian, pembayaran, estimasi selesai, serta ringkasan pendapatan.

## Fitur yang tersedia

### Login dan pembatasan akses

- Pengguna masuk dengan email dan password Supabase di halaman `/login`.
- Peran pengguna diambil dari tabel `profiles`.
- Pengguna dengan peran `owner` diarahkan ke dashboard pemilik; peran `kasir` diarahkan ke halaman kasir.
- Middleware melindungi rute `/dashboard` dan `/kasir`, serta mengarahkan pengguna yang belum login ke halaman login.
- Halaman utama `/` mengarahkan pengguna ke `/login`.

### Dashboard pemilik

Di `/dashboard`, pemilik dapat:

- Melihat pendapatan hari ini, bulan ini, dan akumulasi seluruh order.
- Melihat jumlah order berdasarkan status serta jumlah cucian yang belum diambil.
- Melihat lima order terbaru.
- Mengunduh data order dalam format CSV.
- Membuka pengelolaan layanan dan harga serta pengaturan kapasitas operasional.
- Keluar dari akun.

### Pengelolaan layanan

Di `/dashboard/services`, pemilik dapat:

- Melihat dan memfilter layanan berdasarkan kategori **kiloan** atau **satuan**.
- Menambahkan, mengedit, dan menghapus layanan.
- Mengatur nama, kategori, harga, satuan, dan estimasi selesai.
- Melihat status loading, pesan kesalahan, dan aksi untuk mencoba memuat data kembali.

### Kapasitas operasional

Di `/dashboard/settings`, pemilik dapat mengatur kapasitas harian untuk:

- Laundry kiloan dalam kilogram.
- Laundry satuan dalam poin/item.
- Layanan ekspres Same Day dan Instant dalam slot.

Nilai kapasitas harus lebih dari nol. Perubahan disimpan ke tabel `operational_settings` dan digunakan oleh perhitungan estimasi pada halaman kasir.

### Kasir dan pembuatan order

Di `/kasir`, kasir dapat:

- Memilih layanan, memfilter kategori, mengubah jumlah/berat, dan menghapus item dari keranjang.
- Melihat total harga dan estimasi tanggal selesai sebelum menyimpan transaksi.
- Memasukkan nama pelanggan, nomor WhatsApp, status pembayaran, dan catatan opsional.
- Memvalidasi nomor WhatsApp Indonesia dalam format angka yang diawali `08` atau `628`.
- Menyimpan order dengan nomor invoice, item transaksi, total harga, status awal `masuk`, pembayaran, dan estimasi selesai.
- Melihat nota digital setelah transaksi berhasil dan mencetaknya melalui fungsi cetak browser.
- Membuka daftar cucian atau keluar dari akun.

Nomor invoice dibuat dengan format `INV-YYYYMMDD-NNNN`.

### Daftar dan pemrosesan cucian

Di `/kasir/orders`, kasir dapat:

- Melihat order terbaru serta memfilter status `masuk`, `proses`, `selesai`, dan `diambil`.
- Mencari order berdasarkan nama pelanggan atau nomor invoice.
- Melihat detail pelanggan, item, total, status pembayaran, estimasi selesai, waktu selesai aktual, dan waktu pengambilan.
- Mengubah status pengerjaan dan status pembayaran.
- Melihat tautan WhatsApp untuk menghubungi pelanggan ketika order berstatus selesai.

Waktu penyelesaian dan pengambilan dicatat saat status terkait diperbarui.

### Estimasi antrean

Logika estimasi ada di `src/lib/laundry-utils.ts`. Perhitungan menggunakan durasi layanan, kategori atau satuan, kapasitas operasional, dan order aktif berstatus `masuk` atau `proses`.

- Kiloan dihitung terhadap kapasitas kilogram harian.
- Layanan satuan mempertimbangkan bobot kompleksitas item.
- Same Day dan Instant menggunakan kapasitas slot ekspres.
- Durasi teks seperti menit, jam, atau hari dikonversi menjadi jam untuk menghitung estimasi.
- Kasir melihat ringkasan antrean dan waktu tambahan yang digunakan dalam estimasi.

Modul yang sama juga menyediakan sanitasi dan validasi nomor telepon serta pemformatan tanggal/waktu Indonesia.

### Notifikasi WhatsApp

Ada dua cara yang tampak pada implementasi saat ini:

1. Ketika status order diubah menjadi selesai, halaman order memanggil endpoint `/api/send-wa`.
2. Kartu order yang sudah selesai menyediakan tautan `wa.me` untuk membuka pesan WhatsApp secara manual.

Endpoint API saat ini berada dalam **mode simulasi**: pesan dan nomor tujuan ditulis ke log server dan respons menyediakan tautan WhatsApp. Pengiriman otomatis melalui provider eksternal belum diaktifkan; contoh integrasi provider masih berupa komentar di endpoint.

## Rute aplikasi

| Rute | Kegunaan |
| --- | --- |
| `/` | Mengarahkan pengguna ke halaman login |
| `/login` | Login pemilik atau kasir |
| `/dashboard` | Ringkasan dan fitur pemilik |
| `/dashboard/services` | Pengelolaan layanan dan harga |
| `/dashboard/settings` | Pengaturan kapasitas operasional |
| `/kasir` | Input transaksi dan cetak nota |
| `/kasir/orders` | Pencarian, detail, pembayaran, dan status cucian |
| `/api/send-wa` | Endpoint simulasi pemrosesan notifikasi WhatsApp |

## Struktur kode utama

- `src/app/` — halaman, layout, stylesheet global, dan endpoint API.
- `src/app/dashboard/` — dashboard pemilik, pengelolaan layanan, dan kapasitas.
- `src/app/kasir/` — input order dan daftar cucian.
- `src/components/AppHeader.tsx` — header halaman dan tautan lewati ke konten utama.
- `src/components/Toast.tsx` — notifikasi sukses dan error.
- `src/lib/laundry-utils.ts` — validasi telepon, estimasi, dan format tanggal.
- `src/lib/supabase.ts` — pembuatan Supabase browser client.
- `src/lib/ui.ts` — label/ikon status dan format Rupiah.
- `src/middleware.ts` — pemeriksaan sesi dan peran untuk rute terlindungi.

## Data dan konfigurasi Supabase

Kode aplikasi mengakses tabel berikut:

- `profiles` — kolom `id` dan `role` untuk peran akun.
- `services` — data layanan seperti nama, kategori, harga, satuan, dan estimasi.
- `orders` — invoice, pelanggan, item, total, status pengerjaan/pembayaran, catatan, serta waktu order.
- `operational_settings` — pengaturan kapasitas dengan `id = 1`.

Kasir juga membaca properti layanan `duration`, dan logika estimasi mendukung `complexity_weight` serta `service_tier`. Pastikan struktur tabel Supabase menyediakan kolom yang dipakai oleh alur aplikasi. Kebijakan akses database/RLS dan skema tabel dikelola di Supabase; definisi migrasi skema tidak terlihat di berkas aplikasi yang ditinjau.

Variabel lingkungan yang digunakan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Isi nilai tersebut di `.env.local` secara lokal. Jangan memasukkan kredensial asli ke dokumentasi atau repository.

## Menjalankan proyek

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Perintah yang tersedia di `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Riwayat dan status repository

Riwayat commit yang terlihat mencakup inisialisasi proyek Next.js, penyelesaian fitur tahap pertama, pembaruan judul dan favicon, serta penambahan tombol pengiriman WhatsApp pada kartu order.

Saat ringkasan ini dibuat, terdapat perubahan lokal yang belum di-commit pada halaman dashboard, halaman kasir, dan daftar order, serta berkas baru untuk pengaturan kapasitas dan utilitas laundry. Dokumentasi ini menjelaskan implementasi yang ada di folder kerja, termasuk perubahan lokal tersebut.

## Antarmuka dan pengalaman pengguna

Halaman menggunakan tata letak responsif, komponen loading, pesan error dengan aksi coba lagi pada alur pemuatan data, toast untuk hasil aksi, serta label aksesibilitas dan indikator fokus keyboard pada sejumlah kontrol. Dialog pengelolaan layanan mendukung penutupan dengan tombol Escape.
