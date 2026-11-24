# Laundry Kinclong

Aplikasi kasir dan manajemen operasional laundry berbasis web untuk pemilik dan kasir.
Laundry Kinclong membantu pencatatan order, pengelolaan layanan, pemantauan antrean,
penghitungan estimasi selesai, status cucian, pembayaran, serta ringkasan pendapatan.

## Teknologi

- Next.js 16 dengan App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth dan Supabase Database
- `@supabase/ssr`
- Lucide React

## Peran Pengguna

| Peran | Area aplikasi | Akses utama |
| --- | --- | --- |
| Pemilik (`owner`) | `/dashboard` | Ringkasan bisnis, laporan, layanan, dan kapasitas operasional |
| Kasir (`kasir`) | `/kasir` | Pembuatan order, nota digital, dan pengelolaan cucian |

Akun login, sesi, dan peran pengguna dikelola oleh Supabase. Peran dibaca dari kolom
`role` pada tabel `profiles`.

## Fitur

### Pemilik

- Melihat pendapatan hari ini, bulan ini, dan seluruh periode.
- Melihat jumlah order berdasarkan status dan jumlah cucian yang belum diambil.
- Melihat lima order terbaru.
- Mengekspor data order ke berkas CSV.
- Menambah, mengubah, dan menghapus layanan.
- Mengatur kapasitas harian kiloan, satuan, dan layanan ekspres.

### Kasir

- Memilih layanan kiloan atau satuan.
- Mengelola jumlah item dan isi keranjang transaksi.
- Memvalidasi nomor WhatsApp Indonesia.
- Membuat nomor invoice otomatis.
- Menyimpan informasi pelanggan, item, total, catatan, pembayaran, dan estimasi selesai.
- Menampilkan nota digital yang dapat dicetak melalui browser.
- Memfilter dan mencari order.
- Mengubah status `masuk`, `proses`, `selesai`, dan `diambil`.
- Mengubah status pembayaran menjadi lunas atau belum lunas.

### Estimasi Selesai

Estimasinya dihitung dari:

- Durasi layanan dalam menit, jam, atau hari.
- Berat atau jumlah layanan.
- Kategori kiloan/satuan.
- Berat kompleksitas layanan satuan.
- Kapasitas harian operasional.
- Order aktif berstatus `masuk` atau `proses`.
- Jenis layanan reguler, Same Day, atau Instant.

Logika estimasi berada di `src/lib/laundry-utils.ts`.

### WhatsApp

Saat status order diubah menjadi `selesai`, aplikasi memanggil `POST /api/send-wa`.
Endpoint saat ini beroperasi dalam **mode simulasi**:

- Pesan dicatat di log terminal server.
- API mengembalikan tautan `wa.me` untuk dibuka secara manual.
- Pengiriman melalui Fonnte atau provider lain belum diaktifkan.

## Rute

| Rute | Fungsi |
| --- | --- |
| `/` | Mengarahkan ke halaman login |
| `/login` | Login pemilik atau kasir |
| `/dashboard` | Ringkasan pemilik |
| `/dashboard/services` | Pengelolaan layanan |
| `/dashboard/settings` | Pengaturan kapasitas operasional |
| `/kasir` | Pembuatan order dan nota digital |
| `/kasir/orders` | Daftar dan pemrosesan cucian |
| `/api/send-wa` | Endpoint simulasi notifikasi WhatsApp |

Rute `/login`, `/kasir`, dan `/dashboard` dilindungi melalui middleware berdasarkan sesi
dan peran pengguna.

## Struktur Proyek

```text
src/
  app/
    dashboard/       Halaman pemilik
    kasir/           Halaman kasir dan daftar order
    login/           Halaman autentikasi
    api/send-wa/     Endpoint notifikasi WhatsApp simulasi
    globals.css      Style global
    layout.tsx       Layout aplikasi
  components/
    AppHeader.tsx    Header navigasi
    ServiceIcon.tsx  Ikon layanan
    Toast.tsx        Notifikasi
  lib/
    laundry-utils.ts Estimasi antrean dan utilitas laundry
    supabase.ts      Browser client Supabase
    ui.ts            Konfigurasi tampilan dan format mata uang
  middleware.ts      Pemeriksaan autentikasi dan peran
```

## Persiapan Supabase

Proyek membaca beberapa tabel Supabase berikut:

### `profiles`

Digunakan untuk menentukan peran pengguna.

- `id`
- `role` (`owner` atau `kasir`)

### `services`

- `id`
- `name`
- `category`
- `price`
- `unit`
- `estimated_days`
- `duration`
- `complexity_weight`
- `service_tier`

Kolom `duration`, `complexity_weight`, dan `service_tier` mendukung perhitungan estimasi
apabila tersedia pada data layanan.

### `orders`

- `id`
- `invoice_number`
- `customer_name`
- `customer_phone`
- `items`
- `total_price`
- `status`
- `payment_status`
- `notes`
- `estimated_completion_at`
- `completed_at`
- `picked_up_at`
- `created_at`

### `operational_settings`

- `id`
- `kiloan_daily_capacity_kg`
- `satuan_daily_capacity_items`
- `express_daily_capacity`
- `updated_at`

Baris pengaturan operasional saat ini menggunakan `id = 1`.

> Repository belum menyertakan berkas migrasi atau SQL untuk membuat tabel. Pastikan
> tabel, kolom, dan kebijakan Row Level Security (RLS) di Supabase sudah sesuai dengan
> alur aplikasi di atas.

## Konfigurasi Lingkungan

Buat atau lengkapi berkas `.env.local` di root proyek:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Variabel berikut hanya diperlukan jika integrasi WhatsApp provider akan diaktifkan
sebagai pengembangan lanjutan:

```env
FONNTE_TOKEN=your_provider_token
```

Jangan menyimpan service role key, token provider, atau kredensial lain yang bersifat rahasia
di variabel `NEXT_PUBLIC_*` atau dalam repository.

## Menjalankan Secara Lokal

Prasyarat:

- Node.js versi yang mendukung Next.js 16
- npm
- Proyek dan akun Supabase yang sudah dikonfigurasi

Instal dependensi:

```bash
npm install
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Perintah

```bash
npm run dev      # Menjalankan server pengembangan
npm run build    # Membuat build produksi
npm run start    # Menjalankan hasil build produksi
npm run lint     # Menjalankan ESLint
```

## Penggunaan

1. Buat akun autentikasi di Supabase.
2. Tambahkan profil pengguna pada tabel `profiles` dengan peran `owner` atau `kasir`.
3. Isi tabel `services` dengan layanan, harga, satuan, dan durasi.
4. Pastikan baris `operational_settings` dengan `id = 1` sudah tersedia.
5. Jalankan aplikasi dan login melalui `/login`.
6. Pemilik diarahkan ke `/dashboard`; kasir diarahkan ke `/kasir`.

## Catatan Pengembangan

- Aplikasi berbahasa Indonesia.
- Tampilan mendukung penggunaan desktop dan perangkat seluler.
- Komponen memiliki status loading, pesan error, dan aksi coba lagi pada proses pemuatan data.
- Notifikasi aksi menggunakan komponen Toast.
- Status pengerjaan dan pembayaran disimpan langsung ke tabel Supabase.
