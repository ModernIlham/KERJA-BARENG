# PRD — SIMAN-G (Sistem Informasi Manajemen Aset Negara & Kepegawaian)

> **Versi Dokumen**: 1.0  
> **Tanggal**: Juli 2025  
> **Status**: Dokumentasi MVP Aktif  

---

## 1. Ringkasan Eksekutif

**SIMAN-G** adalah platform web full-stack untuk **pengelolaan Barang Milik Negara (BMN) dan kepegawaian** di lingkungan instansi pemerintah Indonesia. Sistem ini mencakup pengelolaan aset tetap, persediaan, transaksi, kepegawaian (SDM), pembuatan laporan, pencetakan label BMN, persuratan, gudang, stock opname, persetujuan transaksi, notifikasi, dan fitur administrasi lainnya.

### Arsitektur Teknologi
| Komponen | Teknologi |
|---|---|
| Frontend | React 18 + Tailwind CSS + shadcn/ui (Radix UI) |
| Backend | FastAPI (Python) + Motor (Async MongoDB Driver) |
| Database | MongoDB (database: `siman_db`) |
| Autentikasi | JWT (jose) + bcrypt (passlib) |
| PDF Generation | WeasyPrint (server-side) |
| Chart Library | Recharts |
| UI Component | shadcn/ui (Radix), Lucide Icons |
| State Management | React Context (AuthContext) |
| HTTP Client | Axios (interceptor JWT) |
| Routing | React Router v6 |

### Identitas Desain
- **Nama**: SIMAN-G  
- **Archetype**: Swiss & High-Contrast  
- **Font Utama**: IBM Plex Sans (body), Chivo (heading), JetBrains Mono (code/data)  
- **Warna Primer**: State Blue (`#0F172A` / slate-900)  
- **Warna Sekunder**: Asset Gold (`#D97706` / amber-600)  
- **Sidebar**: Dark theme (slate-950), collapsible, dengan popup menu saat collapsed  

---

## 2. Struktur Navigasi & Menu Sidebar

Sidebar terbagi dalam **7 grup utama**:

### 2.1 Beranda
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Dashboard Utama | `/` | LayoutDashboard | Ringkasan statistik aset, persediaan, transaksi |

### 2.2 Kepegawaian
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Dashboard HR | `/kepegawaian` | Briefcase | Statistik pegawai, widget absensi, Kanban tugas |
| Data Pegawai | `/pegawai` | Users | CRUD data pegawai lengkap |
| Manajemen Lembur | `/kepegawaian/lembur` | Clock | Pengajuan, batch, persetujuan, rekap lembur |
| Tugas Tim | `/kepegawaian/tugas` | ClipboardList | Manajemen tugas berbasis Kanban |
| Riwayat Absensi | `/kepegawaian/absensi` | Calendar | Histori absensi dan kehadiran |

### 2.3 Master Data
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Daftar Aset (BMN) | `/barang?tab=aset-tetap` | Database | Master data aset tetap/BMN |
| Daftar Persediaan | `/barang?tab=persediaan` | FolderOpen | Master data persediaan (stok habis pakai) |

### 2.4 Transaksi Aset
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Semua Transaksi | `/transaksi-aset` | ArrowRightLeft | RUH Perolehan, Pengembangan, Perubahan, Penghapusan |
| Aset Pegawai | `/aset-pegawai` | Package | Tracking aset yang dipegang pegawai |
| Notifikasi Aset | `/notifikasi` | Bell | Peringatan pengembalian aset |

### 2.5 Transaksi Persediaan
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Barang Masuk | `/transaksi-persediaan?tab=masuk` | ArrowDownToLine | Pencatatan persediaan masuk |
| Barang Keluar | `/transaksi-persediaan?tab=keluar` | ArrowUpFromLine | Pencatatan persediaan keluar |
| Riwayat Transaksi | `/transaksi-persediaan?tab=riwayat` | History | Histori semua transaksi persediaan |
| Manajemen Gudang | `/gudang` | Warehouse | Pengelolaan lokasi gudang |

### 2.6 Pengamanan BMN
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Dashboard Pengamanan | `/pengamanan-bmn` | Shield | Overview keamanan aset |
| Stock Opname | `/opname` | FileCheck | Verifikasi fisik inventaris |
| Cetak Label BMN | `/label-bmn` | Tag | Cetak stiker label BMN + QR Code |

### 2.7 Administrasi
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Persetujuan Transaksi | `/persetujuan` | CheckCircle2 | Workflow approval transaksi |
| Persuratan | `/surat` | Mail | Manajemen template surat & arsip |
| Dokumen Sumber | `/referensi/dokumen` | FileSpreadsheet | Kelola dokumen SPM, SP2D, BAST, dll |
| **Laporan** (Grup) | | FileText | |
| → Laporan Inti | `/laporan/inti` | | Laporan detail multi-halaman A4 |
| → Laporan Ringkas (1 Hal.) | `/laporan/ringkas` | | Ringkasan eksekutif 1 halaman |
| → Posisi Stok | `/laporan/posisi` | | Laporan posisi stok persediaan |
| → Mutasi Barang | `/laporan/mutasi` | | Laporan mutasi aset |
| → Kartu Gudang | `/laporan/kartu` | | Kartu stok gudang |

### 2.8 Sistem
| Menu | Route | Icon | Deskripsi |
|---|---|---|---|
| Struktur Organisasi | `/organisasi` | Network | Hierarki organisasi instansi |
| Referensi Kode | `/referensi` | Book | Kodefikasi BMN (hierarkis) |
| Banding Data | `/banding` | ArrowRightLeft | Perbandingan & import data |
| Log Aktivitas | `/aktivitas` | Activity | Audit trail semua aksi pengguna |
| Pengaturan | `/pengaturan` | Settings | Konfigurasi sistem |

---

## 3. Detail Modul & Fitur

---

### 3.1 Modul Autentikasi & Otorisasi

**File Backend**: `routes/auth.py`, `auth.py`  
**File Frontend**: `pages/Login.js`, `context/AuthContext.js`

#### Fitur:
- **Login** (`POST /api/auth/login`): Email + password → JWT token (masa berlaku 30 hari)
- **Register** (`POST /api/auth/register`): Pendaftaran user baru dengan role
- **Get Profile** (`GET /api/auth/me`): Ambil profil user terautentikasi
- **Auto-redirect**: Redirect ke `/login` jika token invalid/expired (interceptor Axios)
- **Protected Routes**: Semua halaman kecuali login dilindungi `ProtectedRoute` component

#### Model User:
```
- email (EmailStr, unik)
- full_name (str)
- role (str): "user" | "admin"
- pegawai_id (optional str): Link ke data pegawai
- hashed_password (str, bcrypt)
- created_at (datetime)
```

#### Keamanan:
- Password di-hash dengan bcrypt
- Token JWT menggunakan `HS256` algorithm
- Secret key dari environment variable `SECRET_KEY`
- OAuth2 Bearer scheme

---

### 3.2 Dashboard Utama

**File Backend**: `routes/dashboard.py`  
**File Frontend**: `pages/Dashboard.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/dashboard/summary` | Statistik ringkasan utama |
| GET | `/api/dashboard/rekap-pengeluaran` | Rekapitulasi pengeluaran per golongan |
| GET | `/api/dashboard/filter-options` | Opsi filter (eselon1/2/3) |

#### Data yang Ditampilkan:
- **Kartu Statistik**: Total item aset, total nilai aset, stok kritis, total persediaan, total nilai persediaan
- **Transaksi Summary**: Masuk, keluar, pending
- **Chart Rekapitulasi**: Bar chart pengeluaran per golongan barang (Recharts)
- **Widget Notifikasi**: Ringkasan alert dari modul notifikasi
- **Filter Hierarkis**: Filter berdasarkan eselon1, eselon2, eselon3

---

### 3.3 Modul Master Data Barang (Aset Tetap / BMN)

**File Backend**: `routes/barang.py`  
**File Frontend**: `pages/BarangList.js`, `components/barang/AsetTetapTable.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/barang` | Daftar aset dengan pagination, search, filter |
| GET | `/api/barang/next-nup` | Generate NUP selanjutnya |
| POST | `/api/barang` | Tambah aset baru |
| PUT | `/api/barang/{id}` | Update aset |
| PATCH | `/api/barang/{id}/status` | Ubah status aset |
| DELETE | `/api/barang/{id}` | Hapus aset |
| POST | `/api/barang/import` | Import bulk dari Excel |
| GET | `/api/barang/template` | Download template import Excel |
| GET | `/api/barang/export` | Export data ke Excel |
| GET | `/api/barang/pdf` | Export data ke PDF |
| POST | `/api/barang/bulk-delete` | Hapus aset secara bulk |
| GET | `/api/barang/summary/stats` | Statistik ringkasan aset |
| POST | `/api/barang/{id}/upload-fotos` | Upload foto aset |
| PUT | `/api/barang/{id}/set-thumbnail` | Set foto thumbnail |
| DELETE | `/api/barang/{id}/foto` | Hapus foto aset |
| PUT | `/api/barang/{id}/foto-metadata` | Update metadata foto |

#### Model Data Barang (Aset Tetap):
```
Identifiers:
  - kode_barang, nup, kode_satker, nama_satker, kode_register

Details:
  - nama_barang, merk, tipe, kategori, satuan, kondisi (Baik/Rusak Ringan/Rusak Berat)

Dates:
  - tgl_perolehan, tgl_buku, tgl_penghapusan, tahun_anggaran

Financials:
  - nilai_satuan, nilai_perolehan_pertama, nilai_perolehan, nilai_buku, nilai_penyusutan, nilai_mutasi

Classification (SIMAN):
  - intra_ekstra, status_aset, status_penggunaan, kode_akun, uraian_akun
  - golongan_barang, sub_sub_kelompok, penggolongan_siman

Location:
  - lokasi_fisik, ruang, alamat, kelurahan, kecamatan, kab_kota, provinsi, kode_pos, rt_rw

Land/Building:
  - luas_tanah, luas_bangunan

Certificates:
  - no_sertifikat, status_sertifikasi, tgl_sertifikat, jenis_sertifikat, no_psp, tgl_psp

Inventory:
  - stok, batas_stok_kritis

Others:
  - fotos[] (array foto dengan thumbnail), detail_lainnya (dict dynamic)
  - dokumen_sumber_id (link ke dokumen sumber)
  - nama_penyedia, npwp_penyedia
```

#### Fitur UI:
- Tabel data dengan pagination, search, filter golongan
- Form create/edit dengan semua field di atas
- Import dari Excel (dengan preview)
- Export ke Excel dan PDF
- Manajemen foto (upload, set thumbnail, delete, metadata)
- Hapus bulk
- Tab switching antara Aset Tetap dan Persediaan

---

### 3.4 Modul Master Data Persediaan

**File Backend**: `routes/persediaan.py`  
**File Frontend**: `pages/BarangList.js` (tab Persediaan), `components/barang/PersediaanTable.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/persediaan/` | Daftar persediaan + pagination |
| GET | `/api/persediaan/detail/{id}` | Detail item persediaan |
| POST | `/api/persediaan/` | Tambah persediaan |
| PUT | `/api/persediaan/{id}` | Update persediaan |
| PATCH | `/api/persediaan/{id}/status` | Update status |
| PATCH | `/api/persediaan/{id}/batas-kritis` | Update batas stok kritis |
| DELETE | `/api/persediaan/{id}` | Hapus persediaan |
| GET | `/api/persediaan/template` | Template import Excel |
| GET | `/api/persediaan/update-expired-status` | Auto-update status expired |
| GET | `/api/persediaan/nota-dinas-expired` | Daftar persediaan expired (untuk nota dinas) |
| GET | `/api/persediaan/nota-dinas-kritis` | Daftar persediaan stok kritis (untuk nota dinas) |
| POST | `/api/persediaan/import` | Import bulk |
| POST | `/api/persediaan/export-excel` | Export ke Excel |
| POST | `/api/persediaan/export-pdf` | Export ke PDF |
| POST | `/api/persediaan/bulk-delete` | Hapus bulk |
| POST | `/api/persediaan/{id}/upload-fotos` | Upload foto |
| PUT | `/api/persediaan/{id}/set-thumbnail` | Set thumbnail |
| DELETE | `/api/persediaan/{id}/foto` | Hapus foto |
| PUT | `/api/persediaan/{id}/foto-metadata` | Update metadata foto |

#### Model Data Persediaan:
```
Identifiers:
  - kode_barang, nup, kode_satker, nama_satker, kode_register

Details:
  - nama_barang, merk, tipe, kategori, satuan, kondisi

Dates:
  - tgl_perolehan, tahun_anggaran, expired_date, batch_number

Financials:
  - nilai_satuan, nilai_perolehan, nilai_mutasi

FIFO Batches:
  - batches[] → {batch_id, date, qty, price, nota_dinas, expiry}

Inventory:
  - stok, batas_kritis

Others:
  - fotos[], detail_lainnya, source ("manual"/"import")
```

#### Fitur Khusus:
- Sistem FIFO batch tracking
- Deteksi otomatis expired dan stok kritis
- Nota dinas otomatis untuk expired/kritis
- Import/Export Excel & PDF

---

### 3.5 Modul Data Pegawai

**File Backend**: `routes/pegawai.py`, `routes/pegawai_photos.py`  
**File Frontend**: `pages/PegawaiList.js`, `components/pegawai/*`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/pegawai` | Daftar pegawai + pagination, filter |
| GET | `/api/pegawai/pejabat` | Daftar pejabat (pimpinan struktural) |
| POST | `/api/pegawai` | Tambah pegawai |
| PUT | `/api/pegawai/{id}` | Update pegawai |
| GET | `/api/pegawai/{id}` | Detail pegawai |
| DELETE | `/api/pegawai/{id}` | Hapus pegawai |
| POST | `/api/pegawai/{id}/mutasi` | Proses mutasi pegawai |
| GET | `/api/pegawai/import/template` | Template import Excel |
| POST | `/api/pegawai/import` | Import bulk |
| POST | `/api/pegawai/{id}/signature` | Upload tanda tangan sederhana |
| POST | `/api/pegawai/{id}/signature-advanced` | Upload tanda tangan lanjutan |
| DELETE | `/api/pegawai/{id}/signature-advanced` | Hapus tanda tangan |
| GET | `/api/pegawai/{id}/signatures` | Daftar semua tanda tangan |
| POST | `/api/pegawai/{id}/upload-dokumen` | Upload dokumen pegawai |
| DELETE | `/api/pegawai/{id}/dokumen/{doc_id}` | Hapus dokumen |
| GET | `/api/pegawai/notifications/expiring` | Pegawai kontrak hampir habis |
| POST | `/api/pegawai/{id}/renew-contract` | Perpanjang kontrak |
| GET | `/api/pegawai/{id}/contract-history` | Riwayat kontrak |
| GET | `/api/pegawai/{id}/assets` | Daftar aset yang dipegang pegawai |
| GET | `/api/pegawai/export/excel` | Export ke Excel |
| GET | `/api/pegawai/export/pdf` | Export ke PDF |
| POST | `/api/pegawai/{id}/upload-foto` | Upload foto pegawai |
| DELETE | `/api/pegawai/{id}/foto` | Hapus foto pegawai |

#### Model Data Pegawai:
```
Identitas Utama:
  - nama_lengkap, gelar_depan, gelar_belakang, kewarganegaraan
  - nip (ASN), nrp (TNI/POLRI), nik (KTP), npwp

Identitas WNA:
  - jenis_identitas_wna (PASPOR/KITAS/KITAP), nomor_identitas_wna

Data Pribadi:
  - jenis_kelamin, tempat_lahir, tanggal_lahir, agama, status_perkawinan, pendidikan_terakhir

Status Kepegawaian:
  - status_kepegawaian: PNS, CPNS, PPPK, TNI, POLRI, Non-ASN, Honorer
  - pangkat_golongan (misal: "Penata Muda (III/a)")
  - status_penempatan: Definitif, Mutasi, Penugasan
  - instansi_asal, masa_penugasan_end, status_jabatan: Definitif, Plt, Plh, Pj

Non-ASN Detail:
  - jenis_non_asn: Kontrak, Outsourcing
  - sub_kategori_non_asn: PPNPN, Satpam, Supir, dll
  - nama_perusahaan, nomor_kontrak, tgl_mulai_kontrak, tgl_selesai_kontrak
  - riwayat_kontrak[]

Jabatan & Unit Kerja:
  - jabatan (struktural), jabatan_melekat (fungsional, comma separated)
  - eselon1, eselon2, eselon3, eselon4, eselon5
  - kategori_pegawai: Struktural, Fungsional, Pelaksana

Kontak & Bank:
  - no_telp, email, nama_bank, no_rekening

Status:
  - status: AKTIF, CUTI, TUGAS_BELAJAR, KELUAR, PENSIUN, dll

Leadership:
  - is_pimpinan_tertinggi, jenis_pimpinan: "Kepala"/"Wakil"
  - is_pimpinan_struktural, is_pimpinan_kl
  - jabatan_pimpinan_kl: Menteri, Wakil Menteri, Kepala Lembaga, dll

Media:
  - foto_url, foto_thumbnail_url, signature_url

History:
  - riwayat_karir[] → {tanggal, jenis, deskripsi, jabatan_baru, unit_kerja_baru, pangkat_baru, sk_ref}
  - dokumen[] → {filename, original_name, file_url, keterangan, file_type}
```

#### Komponen UI Pegawai:
| Komponen | File | Fungsi |
|---|---|---|
| PegawaiForm | `PegawaiForm.js` | Form create/edit pegawai lengkap |
| ImportPegawaiModal | `ImportPegawaiModal.js` | Import dari Excel |
| MutasiModal | `MutasiModal.js` | Dialog mutasi pegawai |
| RiwayatKarirModal | `RiwayatKarirModal.js` | Lihat/tambah riwayat karir |
| PegawaiPhotoUpload | `PegawaiPhotoUpload.js` | Upload foto profil pegawai |
| PegawaiPhotoModal | `PegawaiPhotoModal.js` | Modal preview foto |
| PegawaiDocumentModal | `PegawaiDocumentModal.js` | Upload/lihat dokumen pegawai |
| SignaturePad | `SignaturePad.js` | Tanda tangan digital sederhana |
| AdvancedSignaturePad | `AdvancedSignaturePad.js` | Tanda tangan digital lanjutan |
| ContractNotifications | `ContractNotifications.js` | Peringatan kontrak hampir habis |
| UnitKerjaManager | `UnitKerjaManager.js` | Kelola unit kerja |
| InstansiSettings | `InstansiSettings.js` | Pengaturan instansi |
| InstansiLogoUpload | `InstansiLogoUpload.js` | Upload logo instansi |
| BankManager | `BankManager.js` | Kelola daftar bank |

---

### 3.6 Modul Transaksi Aset

**File Backend**: `routes/transaksi.py`, `routes/transaksi_cross.py`, `routes/transaksi_dokumen.py`  
**File Frontend**: `pages/TransaksiAset.js`, `components/transaksi/*`

#### Kategori Transaksi Aset:

**A. RUH Perolehan (Masuk)**
| Sub-Transaksi | Form Component | Deskripsi |
|---|---|---|
| Pembelian | `AssetIncomingForm.js` | Perolehan melalui pembelian |
| Transfer Masuk | `AssetTransferMasukForm.js` | Penerimaan dari unit lain |
| KDP Perolehan | `KDPIncomingForm.js` | Konstruksi Dalam Pengerjaan |
| Reklasifikasi Masuk | `ReklasifikasiMasukForm.js` | Masuk dari perubahan golongan |

**B. RUH Pengembangan**
| Sub-Transaksi | Form Component | Deskripsi |
|---|---|---|
| Pengembangan Langsung | `AssetPengembanganForm.js` | Kapitalisasi langsung ke aset |
| Pengembangan KDP | `KDPPengembanganForm.js` | Melalui Konstruksi Dalam Pengerjaan |

**C. RUH Perubahan**
| Sub-Transaksi | Form Component | Deskripsi |
|---|---|---|
| Perubahan Kuantitas | `PerubahanKuantitasForm.js` | Koreksi jumlah barang |
| Perubahan Kondisi | `PerubahanKondisiForm.js` | Update kondisi (Baik/RR/RB) |
| Koreksi Nilai BMN | `KoreksiNilaiForm.js` | Penyesuaian nilai perolehan/buku |
| Koreksi Nilai KDP | `KoreksiNilaiForm.js` | Penyesuaian nilai KDP |
| Reklasifikasi KDP | `ReklasifikasiKDPForm.js` | Pemindahan nilai antar KDP |

**D. RUH Penghapusan (Keluar)**
| Sub-Transaksi | Form Component | Deskripsi |
|---|---|---|
| Pengeluaran Aset | `AssetOutgoingForm.js` | Serah terima ke pegawai |
| Reklasifikasi Keluar | `ReklasifikasiForm.js` | Keluar karena perubahan golongan |

#### Endpoint API Transaksi:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/transaksi` | Daftar transaksi + pagination |
| POST | `/api/transaksi` | Buat transaksi baru |
| POST | `/api/transaksi/bulk` | Transaksi bulk |
| POST | `/api/transaksi/{id}/upload-bukti` | Upload bukti transaksi |
| POST | `/api/transaksi/perubahan` | Transaksi perubahan (kondisi/kuantitas/nilai) |
| GET | `/api/transaksi/reklasifikasi/pending` | Reklasifikasi pending |
| GET | `/api/transaksi/detail/{id}` | Detail transaksi |
| GET | `/api/transaksi/riwayat` | Riwayat transaksi |

#### Cross-Module Transactions:
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/transaksi-cross/reklasifikasi` | Reklasifikasi Persediaan ↔ Aset |
| GET | `/api/transaksi-cross/riwayat` | Riwayat transaksi lintas modul |

#### Dokumen & Tanda Tangan Transaksi:
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/transaksi-dokumen/{id}/upload` | Upload dokumen transaksi |
| POST | `/api/transaksi-dokumen/{id}/signature` | Tambah tanda tangan |
| DELETE | `/api/transaksi-dokumen/{id}/signature/{sig_id}` | Hapus tanda tangan |
| DELETE | `/api/transaksi-dokumen/{id}/dokumen/{doc_id}` | Hapus dokumen |
| GET | `/api/transaksi-dokumen/pegawai-with-signature` | Pegawai yang punya tanda tangan |
| GET | `/api/transaksi-dokumen/{id}/dokumen` | Daftar dokumen transaksi |

#### Komponen UI Tambahan:
| Komponen | Fungsi |
|---|---|
| `TransactionTable.js` | Tabel daftar transaksi |
| `RiwayatTransaksiComprehensive.js` | Riwayat transaksi komprehensif dengan filter |
| `HierarchicalKodeBarangPicker.js` | Picker kode barang hierarkis |
| `TransactionReportA4.js` | Preview laporan transaksi format A4 |
| `SuratGeneratorModal.js` | Generate surat dari transaksi |
| `TransaksiDokumenManager.js` | Kelola dokumen & tanda tangan transaksi |

#### Model Data Transaksi:
```
- jenis: "MASUK", "KELUAR", "PERUBAHAN_KONDISI", "PERUBAHAN_KUANTITAS", "KOREKSI_NILAI", "REKLASIFIKASI", dll
- barang_id, kode_barang, nup, nama_barang
- jumlah, nilai_satuan, total_nilai
- pegawai_id, nama_pegawai, unit_penerima
- keterangan, dokumen_ref, petugas
- bukti_fotos[]
- dokumen_sumber_id
- no_sppa, no_sppa_2
- nama_penyedia, npwp_penyedia
- timestamp
```

---

### 3.7 Modul Transaksi Persediaan

**File Backend**: `routes/persediaan_transaksi.py`, `routes/persediaan_transaksi_grouped.py`  
**File Frontend**: `pages/TransaksiPersediaan.js`, `components/transaksi/PersediaanIncomingForm.js`, `PersediaanOutgoingForm.js`, `ReklasifikasiPersediaanAsetForm.js`, `RiwayatTransaksiPersediaan.js`

#### Kategori Transaksi Persediaan:

**A. Barang Masuk**
- Pembelian/Pengadaan
- Transfer Masuk
- Hibah/Sumbangan

**B. Barang Keluar**
- Pemakaian Harian
- Serah Terima
- Rusak/Hilang

**C. Perubahan**
- Koreksi Stok
- Koreksi Nilai
- Reklasifikasi ke Aset (cross-module via `/api/transaksi-cross/reklasifikasi`)

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/persediaan-transaksi/` | Riwayat transaksi + pagination |
| GET | `/api/persediaan-transaksi/grouped` | Riwayat transaksi dikelompokkan |
| POST | `/api/persediaan-transaksi/in` | Barang masuk individual |
| POST | `/api/persediaan-transaksi/out` | Barang keluar individual |
| GET | `/api/persediaan-transaksi/history/{persediaan_id}` | Riwayat per item |
| POST | `/api/persediaan-transaksi/in/bulk` | Barang masuk bulk |
| POST | `/api/persediaan-transaksi/out/bulk` | Barang keluar bulk |
| POST | `/api/persediaan-transaksi/upload-bukti` | Upload bukti transaksi |

#### Model Data Transaksi Persediaan:
```
- jenis: "in" | "out"
- persediaan_id, kode_barang, nup, nama_barang
- batch_number, expired_date
- jumlah, nilai_satuan, total_nilai
- stok_sebelum, stok_sesudah
- pegawai_id, nama_pegawai, unit_penerima
- keterangan, dokumen_ref, petugas
- bukti_fotos[]
- Extended: no_bukti, tgl_dokumen, tgl_buku, jenis_dokumen, no_kontrak
- PPK: ppk_id, ppk_nama, npwp, nama_pemilik_npwp
- dokumen_sumber_id, nama_penyedia, npwp_penyedia
```

---

### 3.8 Modul Kepegawaian (HR)

**File Backend**: `routes/kepegawaian.py`  
**File Frontend**: `modules/kepegawaian/*`

#### 3.8.1 Dashboard HR
- **Halaman**: `DashboardKepegawaian.jsx`
- **Stat Cards**: Total Pegawai, Hadir Hari Ini, Izin/Sakit, Total Jam Lembur
- **Widget Absensi** (`AbsensiWidget.jsx`): Clock-in/out dengan foto selfie dan GPS
- **Kanban Board** (`KanbanBoard.jsx`): Board tugas tim (Todo → In Progress → Review → Done)

#### 3.8.2 Absensi / Kehadiran
- **Halaman**: `RiwayatAbsensi.jsx`
- **Endpoint**:
  - `GET /api/kepegawaian/attendance/today` — Status absensi hari ini
  - `POST /api/kepegawaian/attendance/clock-in` — Clock in dengan foto + lokasi GPS + alamat
  - `POST /api/kepegawaian/attendance/clock-out` — Clock out dengan foto + lokasi GPS
  - `GET /api/kepegawaian/attendance/history` — Riwayat absensi

- **Model Attendance**:
  ```
  - user_id, pegawai_id, nama_lengkap, date
  - clock_in, clock_out (datetime)
  - clock_in_photo, clock_out_photo (URL)
  - location_in, location_out → {lat, lng, accuracy, address}
  - status: "Hadir", "Telat", "Pulang Cepat"
  - keterangan
  ```

- **Komponen**: `SelfieCapture.jsx` (webcam capture), `AttendanceModal.jsx`

#### 3.8.3 Manajemen Lembur
- **Halaman**: `ManajemenLembur.jsx`
- **Komponen**:
  | Komponen | Fungsi |
  |---|---|
  | `OvertimeRangeForm.jsx` | Form lembur multi-hari dengan break time & per-peserta config |
  | `OvertimeBatchList.jsx` | Daftar batch SPL lembur |
  | `OvertimeApproval.jsx` | Persetujuan lembur |
  | `OvertimeSettings.jsx` | Pengaturan tarif lembur |
  | `HolidayManagement.jsx` | Kelola hari libur |
  | `DafnomLembur.jsx` | Daftar nominatif lembur |
  | `DafnomSPL.jsx` | Daftar nominatif per SPL |

- **Endpoint Lembur**:
  | Method | Endpoint | Deskripsi |
  |---|---|---|
  | GET | `/api/kepegawaian/settings` | Ambil pengaturan tarif lembur |
  | PUT | `/api/kepegawaian/settings` | Update tarif lembur |
  | GET | `/api/kepegawaian/holidays` | Daftar hari libur |
  | POST | `/api/kepegawaian/holidays` | Tambah hari libur |
  | PUT | `/api/kepegawaian/holidays/{id}` | Update hari libur |
  | DELETE | `/api/kepegawaian/holidays/{id}` | Hapus hari libur |
  | POST | `/api/kepegawaian/holidays/bulk` | Import hari libur bulk |
  | POST | `/api/kepegawaian/overtime` | Buat pengajuan lembur |
  | POST | `/api/kepegawaian/overtime/batch` | Buat batch lembur (multi-pegawai) |
  | POST | `/api/kepegawaian/overtime/range` | Buat lembur multi-hari |
  | GET | `/api/kepegawaian/overtime/check-holidays` | Cek hari libur range tanggal |
  | GET | `/api/kepegawaian/overtime/batches` | Daftar batch SPL |
  | GET | `/api/kepegawaian/overtime/batch/{batch_id}` | Detail batch SPL |
  | PATCH | `/api/kepegawaian/overtime/batch/{batch_id}/{action}` | Approve/reject batch |
  | POST | `/api/kepegawaian/overtime/batch/{batch_id}/partial` | Partial approve batch |
  | GET | `/api/kepegawaian/overtime/recap-by-spl` | Rekap per SPL |
  | GET | `/api/kepegawaian/overtime` | Daftar semua pengajuan lembur |
  | PATCH | `/api/kepegawaian/overtime/{oid}/{action}` | Approve/reject individual |
  | GET | `/api/kepegawaian/overtime/recap` | Rekap lembur |
  | GET | `/api/kepegawaian/overtime/dafnom` | Daftar nominatif lembur |
  | POST | `/api/kepegawaian/upload` | Upload file SPL/bukti |

- **Model Pengaturan Tarif Lembur (OvertimeSettings)**:
  ```
  Tarif per jam ASN (per Golongan I-IV):
    rate_asn_gol_1..4

  Tarif per jam Non-ASN (per Kategori):
    rate_non_asn_ppnpn, rate_non_asn_konsultan, rate_non_asn_tenaga_ahli,
    rate_non_asn_teknisi, rate_non_asn_pramubakti, rate_non_asn_satpam, rate_non_asn_supir

  Uang Makan ASN (per Golongan):
    meal_asn_gol_1_2, meal_asn_gol_3, meal_asn_gol_4

  Uang Makan Non-ASN (per Kategori):
    meal_non_asn_ppnpn, ..._konsultan, ..._satpam, dll

  Pajak ASN (per Golongan):
    tax_asn_gol_1: 0%, tax_asn_gol_2: 0%, tax_asn_gol_3: 5%, tax_asn_gol_4: 15%

  Pajak Non-ASN (per Kategori):
    tax_non_asn_ppnpn, ..._konsultan, dll
  ```

- **Model Overtime Request**:
  ```
  - user_id, pegawai_id, nama_lengkap, nip
  - batch_id, nomor_spl
  - employee_type: ASN / NON_ASN
  - grade, sub_kategori
  - date, is_holiday, start_time, end_time, duration_hours
  - description, status: Pending / Approved / Rejected
  - Financial: rate_per_hour, meal_allowance, gross_pay, tax_amount, net_pay
  - spl_file, evidence_files[]
  ```

- **Multi-Day Overtime (OvertimeRangeCreate)**:
  ```
  - start_date, end_date, description
  - participant_ids[]
  - days[] → {date, is_holiday, breaks[], participants[] → {pegawai_id, attending, start_time, end_time}}
  - default_start_time, default_end_time, default_breaks[]
  ```

- **Utilitas**: `perhitunganGaji.js` — Kalkulasi gaji lembur di frontend

#### 3.8.4 Manajemen Tugas (Kanban)
- **Halaman**: `ManajemenTugas.jsx`
- **Endpoint**:
  | Method | Endpoint | Deskripsi |
  |---|---|---|
  | GET | `/api/tasks/` | Daftar semua tugas |
  | POST | `/api/tasks/` | Buat tugas baru |
  | PATCH | `/api/tasks/{task_id}` | Update tugas (termasuk drag-drop status) |
  | DELETE | `/api/tasks/{task_id}` | Hapus tugas |
  | POST | `/api/tasks/{task_id}/comments` | Tambah komentar |

- **Model Task**:
  ```
  - title, description
  - assignee_id, assignee_name, assignee_avatar
  - status: "todo", "in-progress", "review", "done"
  - priority: "low", "medium", "high", "urgent"
  - due_date
  - related_asset_id, related_asset_name, related_asset_kode
  - created_by_id, created_by_name
  - comments[] → {user_id, user_name, text, created_at}
  - tags[]
  ```

#### 3.8.5 Flexi Time Settings
- **Komponen**: `FlexiTimeSettings.jsx`
- **Endpoint**:
  - `GET /api/activity/flexi-time` — Ambil pengaturan flexi time
  - `PUT /api/activity/flexi-time` — Update pengaturan flexi time

#### 3.8.6 Reset Data Kepegawaian
- `DELETE /api/kepegawaian/reset/overtime` — Reset data lembur
- `DELETE /api/kepegawaian/reset/employees` — Reset data pegawai
- `DELETE /api/kepegawaian/reset/all` — Reset semua data kepegawaian

---

### 3.9 Modul Label BMN (Pencetakan Label & Stiker)

**File Backend**: `routes/label_bmn.py`, `routes/generate_pdf_task_new.py`  
**File Frontend**: `pages/LabelBMN.jsx`, `pages/LabelBMN/components/*`

Ini adalah modul yang **paling kompleks** di aplikasi, terdiri dari banyak sub-fitur.

#### Tab di Halaman Label BMN:
| Tab | Komponen | Deskripsi |
|---|---|---|
| Daftar Aset | `AssetTable.jsx` | Tabel aset untuk pemilihan cetak label |
| Antrian | (inline) | Antrian cetak / print queue |
| Riwayat | `PrintHistoryTab.jsx` | Riwayat pencetakan label |
| Kustomisasi QR | `QRCustomizationPanel.jsx` | Kustomisasi QR Code template |
| Pengaturan Design | `StickerDesignTab.jsx` | Editor desain stiker dengan 3-panel layout |
| Canvas Editor (Beta) | `StickerCanvasEditor.jsx` | Canvas editor drag-drop untuk desain stiker |

#### Endpoint API Label BMN:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/label-bmn/instansi-info` | Info instansi untuk header label |
| GET | `/api/label-bmn/assets` | Daftar aset + pagination untuk label |
| GET | `/api/label-bmn/assets/all` | Semua aset (tanpa pagination) |
| POST | `/api/label-bmn/assets/all-ids` | Ambil semua ID aset |
| GET | `/api/label-bmn/asset/{barang_id}` | Detail aset untuk label |
| POST | `/api/label-bmn/child-asset` | Buat child asset |
| GET | `/api/label-bmn/child-assets/{parent_id}` | Daftar child asset |
| DELETE | `/api/label-bmn/child-asset/{child_id}` | Hapus child asset |
| POST | `/api/label-bmn/print-batch` | Log batch pencetakan |
| GET | `/api/label-bmn/print-stats` | Statistik pencetakan |
| GET | `/api/label-bmn/print-history` | Riwayat pencetakan |

**Sticker Design Management:**
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/label-bmn/sticker-designs` | Daftar semua desain stiker |
| GET | `/api/label-bmn/sticker-design/{id}` | Detail desain |
| POST | `/api/label-bmn/sticker-design` | Simpan desain baru |
| PUT | `/api/label-bmn/sticker-design/{id}` | Update desain |
| DELETE | `/api/label-bmn/sticker-design/{id}` | Hapus desain |
| DELETE | `/api/label-bmn/sticker-designs/reset-all` | Reset semua desain |
| POST | `/api/label-bmn/sticker-design/{id}/duplicate` | Duplikat desain |
| POST | `/api/label-bmn/sticker-design/set-active` | Set desain aktif |
| GET | `/api/label-bmn/sticker-design/active/{size_type}` | Ambil desain aktif per ukuran |

**QR Code Template Management:**
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/label-bmn/qr-templates` | Daftar QR templates |
| POST | `/api/label-bmn/qr-template` | Buat template QR |
| PUT | `/api/label-bmn/qr-template/{id}` | Update template QR |
| DELETE | `/api/label-bmn/qr-template/{id}` | Hapus template QR |
| DELETE | `/api/label-bmn/qr-templates/reset-all` | Reset semua template |
| POST | `/api/label-bmn/qr-template/set-active` | Set template aktif |
| GET | `/api/label-bmn/qr-template/active` | Ambil template aktif |

**PDF Generation:**
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/label-bmn/generate-pdf` | Generate PDF label (async job) |
| GET | `/api/label-bmn/pdf-status/{job_id}` | Status job PDF |
| GET | `/api/label-bmn/pdf/{job_id}` | Download PDF hasil |

#### Komponen Frontend Label BMN:
| Komponen | Fungsi |
|---|---|
| `AssetTable.jsx` | Tabel aset dengan checkbox untuk seleksi, pencarian, pagination |
| `CustomSticker.jsx` | Render stiker preview berdasarkan pengaturan desain |
| `StickerDesignTab.jsx` | 3-panel editor: Template Design (kiri), Preview Stiker (tengah), Editor Design (kanan) |
| `DesignEditorForm.jsx` | Form editor desain dengan tab: Struktur, Dimensi, QR Code, Header, Konten, Border, Tampilan |
| `StickerTemplates.jsx` | Template stiker preset (Kecil, Sedang, Besar) |
| `QRCustomizationPanel.jsx` | Panel kustomisasi QR Code (error correction, warna, ukuran, border) |
| `StickerCanvasEditor.jsx` | Canvas editor drag-drop dengan elemen: Text, QR Code, Table, Image, Shape, Barcode |
| `PrintPage.jsx` | Halaman cetak label |
| `PrintHistoryTab.jsx` | Tab riwayat pencetakan |
| `ChildAssetModal.jsx` | Modal untuk child asset (sub-item) |

#### Ukuran Stiker:
- **Kecil** (label kecil)
- **Sedang** (6.98 x 2.21 cm)
- **Besar** (9.49 x 3.22 cm)
- **A4** (full page)
- **Custom** (ukuran bebas)

#### Editor Desain (DesignEditorForm):
- **Tab Struktur**: Toggle on/off elemen (Header, QR Code, Kode Barang, NUP, Gold Stripe, Warning, dll) — 18 switches
- **Tab Dimensi**: Width, height, padding, margin — 7 input angka
- **Tab QR Code**: QR size, position, style
- **Tab Header**: Header text, font, color
- **Tab Konten**: Baris konten (Tambah Baris), font settings
- **Tab Border**: Border style, color — 2 color pickers
- **Tab Tampilan**: Background, opacity, general style

#### Canvas Editor (Beta):
- Drag-drop element placement
- Element types: Text, QR Code, Table, Image, Shape, Barcode
- Properties panel (position X/Y, size W/H, font, color)
- Zoom controls
- Template selection dialog (5 options)
- Save/load designs
- Element management (duplicate, delete)

---

### 3.10 Modul KIB (Kartu Inventarisasi Barang)

**File Backend**: `routes/kib.py`  
**File Frontend**: `components/barang/KIBModal.jsx`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/aset/kib/settings` | Pengaturan template KIB |
| PUT | `/api/aset/kib/settings` | Update pengaturan KIB |
| GET | `/api/aset/kib/{aset_id}` | Data KIB untuk aset tertentu |
| GET | `/api/aset/kib/{aset_id}/pdf` | Generate PDF KIB |

---

### 3.11 Modul Aset Pegawai (Tracking)

**File Backend**: `routes/aset_pegawai.py`  
**File Frontend**: `pages/AsetPegawaiList.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/aset-pegawai` | Daftar aset pegawai + pagination |
| POST | `/api/aset-pegawai` | Buat assignment aset ke pegawai |
| GET | `/api/aset-pegawai/{id}` | Detail assignment |
| PUT | `/api/aset-pegawai/{id}` | Update assignment |
| DELETE | `/api/aset-pegawai/{id}` | Hapus assignment |
| POST | `/api/aset-pegawai/{id}/serah-terima` | Proses serah terima |
| POST | `/api/aset-pegawai/{id}/kembalikan` | Proses pengembalian aset |
| GET | `/api/aset-pegawai/pegawai/{pegawai_id}/aset` | Daftar aset per pegawai |
| GET | `/api/aset-pegawai/alerts/pegawai-keluar` | Alert pegawai yang akan keluar (belum kembalikan aset) |
| GET | `/api/aset-pegawai/statistik/summary` | Statistik ringkasan |

---

### 3.12 Modul Gudang (Warehouse Management)

**File Backend**: `routes/gudang.py`  
**File Frontend**: `pages/GudangList.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/gudang` | Daftar gudang |
| GET | `/api/gudang/summary` | Ringkasan gudang |
| GET | `/api/gudang/{gudang_id}` | Detail gudang |
| POST | `/api/gudang` | Buat gudang baru |
| PUT | `/api/gudang/{gudang_id}` | Update gudang |
| DELETE | `/api/gudang/{gudang_id}` | Hapus gudang |
| GET | `/api/gudang/movements/list` | Daftar pergerakan barang |
| GET | `/api/gudang/assets/{gudang_id}` | Daftar aset di gudang |
| POST | `/api/gudang/return-asset` | Pengembalian aset ke gudang |
| POST | `/api/gudang/distribute-asset` | Distribusi aset dari gudang |
| POST | `/api/gudang/transfer-asset` | Transfer antar gudang |

---

### 3.13 Modul Notifikasi (Asset Return Alerts)

**File Backend**: `routes/notifications.py`  
**File Frontend**: `pages/NotificationList.js`

#### Tipe Notifikasi:
| Tipe | Deskripsi |
|---|---|
| PENSIUN | Pegawai akan memasuki masa pensiun |
| HABIS_KONTRAK | Kontrak kerja pegawai akan berakhir |
| HABIS_PENUGASAN | Masa penugasan pegawai akan berakhir |
| MUTASI | Pegawai akan dimutasi ke unit lain |

#### Prioritas Alert:
| Prioritas | Jangka Waktu | Warna |
|---|---|---|
| KRITIS | ≤ 7 hari | Merah (#DC2626) |
| TINGGI | ≤ 14 hari | Oranye (#EA580C) |
| SEDANG | ≤ 21 hari | Kuning (#D97706) |
| RENDAH | ≤ 30 hari | Biru (#2563EB) |
| PERSIAPAN | ≤ 60 hari | Abu (#6B7280) |

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/notifications/alerts` | Daftar semua alert |
| GET | `/api/notifications/alerts/summary` | Ringkasan alert |
| GET | `/api/notifications/alerts/{alert_id}` | Detail alert |
| POST | `/api/notifications/alerts/{alert_id}/action` | Tindak lanjut alert |
| GET | `/api/notifications/types` | Daftar tipe notifikasi |
| GET | `/api/notifications/priorities` | Daftar prioritas |
| GET | `/api/notifications/dashboard-widget` | Widget untuk dashboard |

---

### 3.14 Modul Persetujuan Transaksi (Approval)

**File Backend**: `routes/approval.py`  
**File Frontend**: `components/transaksi/ApprovalPage.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/approval/pending` | Daftar transaksi menunggu persetujuan |
| GET | `/api/approval/stats` | Statistik approval |
| POST | `/api/approval/{transaction_id}/approve` | Setujui transaksi |
| POST | `/api/approval/{transaction_id}/reject` | Tolak transaksi |
| POST | `/api/approval/bulk-approve` | Persetujuan massal |
| GET | `/api/approval/history` | Riwayat persetujuan |
| GET | `/api/approval/config` | Konfigurasi approval |
| PUT | `/api/approval/config` | Update konfigurasi |

---

### 3.15 Modul Stock Opname

**File Backend**: `routes/opname.py`  
**File Frontend**: `pages/StockOpname.js`, `pages/StockOpnamePrintView.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/opname/` | Riwayat stock opname |
| POST | `/api/opname/` | Buat record stock opname |

#### Model Data:
```
- tanggal, barang_id
- asset_type: "barang" | "persediaan"
- nama_barang
- stok_sistem, stok_fisik, selisih
- keterangan, petugas
- status: "Completed"
```

#### Fitur UI:
- Form input stock opname (bandingkan stok sistem vs fisik)
- Tabel riwayat opname
- Print view untuk cetak laporan opname

---

### 3.16 Modul Pengamanan BMN

**File Backend**: Data diambil dari modul lain (dashboard, aset, opname)  
**File Frontend**: `pages/PengamananBMN.js`

#### Fitur:
- Dashboard overview pengamanan BMN
- Statistik kondisi aset
- Status pelabelan BMN
- Link ke Stock Opname
- Link ke Cetak Label BMN

---

### 3.17 Modul Laporan

**File Backend**: `routes/laporan.py`, `routes/laporan_bmn.py`, `routes/laporan_inti.py`  
**File Frontend**: `pages/Laporan.js`, `pages/LaporanBMN.js`, `pages/LaporanInti.jsx`, `pages/LaporanRingkas.jsx`

#### 3.17.1 Laporan Inti (Multi-halaman A4)
**File**: `pages/LaporanInti.jsx`  
**Endpoint**:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/laporan-inti/full-report` | Data laporan inti lengkap |
| GET | `/api/laporan-inti/full-report/pdf` | Export PDF laporan inti (WeasyPrint) |
| GET | `/api/laporan-inti/ringkasan-eksekutif` | Ringkasan eksekutif |
| GET | `/api/laporan-inti/rekapitulasi-kategori` | Rekapitulasi per kategori |
| GET | `/api/laporan-inti/kondisi-aset` | Data kondisi aset |
| GET | `/api/laporan-inti/pelabelan-aset` | Status pelabelan |
| GET | `/api/laporan-inti/pengamanan-aset` | Data pengamanan |
| GET | `/api/laporan-inti/persediaan` | Data persediaan |
| GET | `/api/laporan-inti/dasar-hukum` | Dasar hukum |

**Fitur**: Format A4 multi-halaman (4+ halaman), header instansi, tabel data lengkap, cetak browser, download PDF.

#### 3.17.2 Laporan Ringkas (1 Halaman)
**File**: `pages/LaporanRingkas.jsx`  
**Endpoint**:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/laporan-inti/ringkas` | Data laporan ringkas |
| GET | `/api/laporan-inti/ringkas/pdf` | Export PDF (WeasyPrint) |

**Fitur**: Grand total (Nilai Aset, Nilai Buku, Jumlah Item, Selisih), breakdown per golongan, kondisi aset (%), pengamanan BMN, status pelabelan — semua dalam 1 halaman.

#### 3.17.3 Laporan Posisi Stok, Mutasi, Kartu Gudang
**File**: `pages/Laporan.js`  
**Endpoint**:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/laporan/posisi-stok` | Posisi stok persediaan |
| GET | `/api/laporan/mutasi` | Mutasi barang |
| GET | `/api/laporan/kartu-gudang` | Kartu gudang |

#### 3.17.4 Laporan BMN Summary
**File**: `pages/LaporanBMN.js`  
**Endpoint**:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/laporan-bmn/bmn-summary` | Ringkasan BMN per golongan |
| GET | `/api/laporan-bmn/bmn-summary/pdf` | Export PDF ringkasan BMN |

---

### 3.18 Modul Persuratan

**File Backend**: `routes/surat.py`  
**File Frontend**: `pages/Surat.js`, `components/surat/TemplateEditor.js`, `components/surat/KopSuratDesigns.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/surat/templates/seed` | Seed template default |
| GET | `/api/surat/templates` | Daftar template surat |
| POST | `/api/surat/templates` | Buat template baru |
| PUT | `/api/surat/templates/{id}` | Update template |
| DELETE | `/api/surat/templates/{id}` | Hapus template |
| GET | `/api/surat/arsip` | Daftar arsip surat |
| POST | `/api/surat/generate-preview` | Generate preview surat |
| POST | `/api/surat/save-generated` | Simpan surat yang sudah di-generate |

#### Model Data:
- **SuratTemplate**:
  ```
  - nama_template, jenis: "MASUK"/"KELUAR"/"BAST"/"SBB"/"LAINNYA"
  - konten: HTML dengan {{placeholders}}
  - kop_active, css_style, custom_kop_html, kop_style: "standard"
  ```

- **SuratArsip**:
  ```
  - nomor_surat, tanggal_surat, jenis_surat, template_id
  - transaksi_ids[] (linked transactions)
  - konten_final (HTML snapshot)
  - file_path (PDF)
  - created_by, kategori
  ```

#### Fitur:
- Template editor dengan HTML + {{placeholder}}
- Kop surat (standard / custom HTML)
- Generate preview surat berdasarkan template + data
- Link ke transaksi
- Arsip surat digital

---

### 3.19 Modul Dokumen Sumber

**File Backend**: `routes/dokumen.py`  
**File Frontend**: `pages/DokumenList.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/dokumen-sumber` | Daftar dokumen sumber + pagination |
| GET | `/api/dokumen-sumber/{id}` | Detail dokumen |
| POST | `/api/dokumen-sumber` | Buat dokumen baru |
| PUT | `/api/dokumen-sumber/{id}` | Update dokumen |
| DELETE | `/api/dokumen-sumber/{id}` | Hapus dokumen |
| GET | `/api/dokumen-sumber/search/lookup` | Cari dokumen (autocomplete) |
| POST | `/api/dokumen-sumber/{id}/upload` | Upload file lampiran |

#### Jenis Dokumen Sumber:
- SPM (Surat Perintah Membayar)
- SP2D (Surat Perintah Pencairan Dana)
- BAST (Berita Acara Serah Terima)
- Kontrak
- Kuitansi

#### Model Data:
```
- jenis_dokumen, nomor_dokumen, tanggal_dokumen
- PPK: ppk_id, ppk_nama
- Penyedia: nama_penyedia, npwp_penyedia
- akun_belanja, uraian, nilai_total
- file_url, nomor_spm, tanggal_spm, file_spm_url
- BAST: nomor_bast, tanggal_bast, file_bast_url
- kategori: "Persediaan"/"Aset Tetap"/"Umum"
- dokumen_attachments[]
- template_name, template_content
```

---

### 3.20 Modul Referensi Kode (Kodefikasi BMN)

**File Backend**: `routes/referensi.py`  
**File Frontend**: `pages/ReferensiKode.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/referensi` | Daftar kode + pagination |
| GET | `/api/referensi/template` | Template import Excel |
| POST | `/api/referensi/import` | Import kodefikasi dari Excel |
| POST | `/api/referensi` | Tambah kode |
| PUT | `/api/referensi/{id}` | Update kode |
| DELETE | `/api/referensi/{id}` | Hapus kode |
| GET | `/api/referensi/lookup` | Cari kode (autocomplete) |
| GET | `/api/referensi/golongan` | Daftar golongan barang |
| GET | `/api/referensi/by-golongan/{kode}` | Kode per golongan |
| GET | `/api/referensi/all-levels/{kode}` | Semua level hierarki |
| GET | `/api/referensi/export/excel` | Export ke Excel |
| GET | `/api/referensi/export/pdf` | Export ke PDF |

#### Model Kodefikasi:
```
- kode (string, hierarkis mis: "1.01.01.01.001")
- uraian (deskripsi)
- level (integer, kedalaman hierarki)
- parent_kode (optional)
```

---

### 3.21 Modul Struktur Organisasi

**File Backend**: Data dari modul pegawai/settings  
**File Frontend**: `pages/StrukturOrganisasi.js`

#### Fitur:
- Visualisasi pohon organisasi instansi
- Hierarki eselon1 → eselon2 → eselon3 → eselon4 → eselon5
- Tampilkan jabatan dan nama pejabat
- Interaktif (expand/collapse)

---

### 3.22 Modul Banding Data (Data Comparison & Import)

**File Backend**: `routes/banding.py`  
**File Frontend**: `pages/BandingData.js`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/banding/compare` | Upload file untuk dibandingkan dengan data di sistem |
| POST | `/api/banding/import` | Import data yang sudah diverifikasi |

#### Fitur:
- Upload file Excel
- Bandingkan data upload vs data sistem (diff)
- Preview perubahan
- Konfirmasi import

---

### 3.23 Modul Log Aktivitas (Audit Trail)

**File Backend**: `routes/activity.py`, `lib/activity_logger.py`  
**File Frontend**: `pages/activity/ActivityLogPage.jsx`, `pages/activity/UserActivityReport.jsx`

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/activity/logs` | Daftar log aktivitas + filter |
| GET | `/api/activity/summary` | Ringkasan aktivitas |
| GET | `/api/activity/users` | Daftar user yang memiliki log |
| GET | `/api/activity/modules` | Daftar modul |
| GET | `/api/activity/actions` | Daftar jenis aksi |
| GET | `/api/activity/user/{user_id}` | Log per user |
| POST | `/api/activity/log` | Catat log aktivitas manual |

#### Model ActivityLog:
```
- user_id, user_name
- action: "CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"
- module: "Barang", "Persediaan", "Kepegawaian", dll
- target_id (ID objek yang di-aksi)
- details (ringkasan terbaca)
- metadata (snapshot data / diff)
- timestamp
```

#### Hooks Frontend:
- `useActivityLogger.js` — Custom hook untuk log aktivitas dari frontend

---

### 3.24 Modul Pengaturan Sistem

**File Backend**: `routes/settings.py`  
**File Frontend**: `pages/Pengaturan.js`

#### Tab Pengaturan:
| Tab | Fitur |
|---|---|
| Instansi | Nama, alamat, telepon, email, website, logo, pimpinan (NIP) |
| Unit Kerja | CRUD unit kerja, reorder, move |
| Bank | CRUD daftar bank |
| Pengguna | Daftar user sistem |
| Flexi Time | Pengaturan jam kerja fleksibel |
| Database | Normalize data, recalculate stock, reset, backup |

#### Endpoint API:
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/settings/users` | Daftar user |
| GET/POST/PUT/DELETE | `/api/settings/unit-kerja` | CRUD unit kerja |
| POST | `/api/settings/unit-kerja/reorder` | Reorder unit kerja |
| GET/POST/PUT/DELETE | `/api/settings/banks` | CRUD bank |
| POST | `/api/settings/database/normalize` | Normalize database |
| POST | `/api/settings/database/recalculate-stock` | Recalculate stok |
| POST | `/api/settings/database/reset` | Reset database |
| POST | `/api/settings/database/reset-gudang-aset` | Reset gudang & aset |
| GET/PUT | `/api/settings/instansi` | Pengaturan instansi |
| POST | `/api/settings/instansi/logo` | Upload logo instansi |
| DELETE | `/api/settings/instansi/logo` | Hapus logo instansi |
| GET | `/api/settings/database/backup` | Backup database |
| GET/PUT | `/api/settings/config` | Konfigurasi umum |

#### Model InstansiSettings:
```
- nama_instansi, alamat, telepon, email, website, kota, kodepos
- logo_url
- nama_pimpinan, nip_pimpinan
- kode_uakpb
```

---

## 4. Cross-Cutting Concerns

### 4.1 Upload File
- Upload foto aset, foto pegawai, dokumen, bukti transaksi
- Disimpan di `/app/uploads/` (mounted di `/api/uploads`)
- Image processing via `lib/image_processor.py`
- Chunked upload support

### 4.2 PDF Generation
- **WeasyPrint** (server-side): Untuk laporan, label BMN, KIB
- **Browser print** (client-side): `window.print()` dengan CSS print-specific
- **Direct print**: `document.write()` + `window.print()`
- Generated PDFs disimpan di `/app/backend/generated_pdfs/`

### 4.3 Activity Logging
- `lib/activity_logger.py` — Logger terpusat di backend
- `hooks/useActivityLogger.js` — Logger di frontend
- Semua aksi CRUD dicatat

### 4.4 Export Data
- **Excel**: Export ke `.xlsx` (barang, persediaan, pegawai, referensi)
- **PDF**: Export ke PDF (barang, persediaan, pegawai, referensi, laporan)
- **Print**: Browser print untuk laporan dan label

---

## 5. Struktur File Proyek

### 5.1 Backend (`/app/backend/`)
```
├── server.py                    # FastAPI app utama + router registration
├── auth.py                      # JWT authentication logic
├── models.py                    # Model utama (User, Barang, Pegawai, Transaksi, dll)
├── models_kepegawaian.py        # Model kepegawaian (Attendance, Overtime, dll)
├── models_activity.py           # Model activity log
├── models_task.py               # Model task/kanban
├── requirements.txt             # Python dependencies
├── lib/
│   ├── activity_logger.py       # Activity logging utility
│   └── image_processor.py       # Image processing utility
├── routes/
│   ├── auth.py                  # Auth endpoints
│   ├── barang.py                # Aset tetap CRUD + import/export
│   ├── persediaan.py            # Persediaan CRUD + import/export
│   ├── pegawai.py               # Pegawai CRUD + mutasi + signature
│   ├── pegawai_photos.py        # Foto pegawai upload/delete
│   ├── transaksi.py             # Transaksi aset
│   ├── transaksi_cross.py       # Transaksi lintas modul
│   ├── transaksi_dokumen.py     # Dokumen & tanda tangan transaksi
│   ├── persediaan_transaksi.py  # Transaksi persediaan
│   ├── dashboard.py             # Dashboard statistik
│   ├── kepegawaian.py           # Kepegawaian (attendance, overtime, dll)
│   ├── tasks.py                 # Task/Kanban
│   ├── label_bmn.py             # Label BMN management
│   ├── generate_pdf_task_new.py # PDF generation task
│   ├── kib.py                   # Kartu Inventarisasi Barang
│   ├── aset_pegawai.py          # Aset pegawai tracking
│   ├── gudang.py                # Gudang/warehouse management
│   ├── notifications.py         # Notifikasi & alert
│   ├── approval.py              # Approval workflow
│   ├── opname.py                # Stock opname
│   ├── laporan.py               # Laporan posisi stok/mutasi/kartu
│   ├── laporan_bmn.py           # Laporan BMN summary
│   ├── laporan_inti.py          # Laporan inti & ringkas
│   ├── surat.py                 # Persuratan
│   ├── dokumen.py               # Dokumen sumber
│   ├── referensi.py             # Referensi kode
│   ├── banding.py               # Banding data
│   ├── activity.py              # Activity logging + flexi time
│   ├── settings.py              # Pengaturan sistem
│   └── logo_logic.py            # Logo upload logic
└── generated_pdfs/              # Output PDF yang di-generate
```

### 5.2 Frontend (`/app/frontend/src/`)
```
├── App.js                       # Root routing + AuthProvider
├── App.css                      # Global styles
├── index.js                     # Entry point
├── index.css                    # Tailwind imports
├── api/
│   └── axios.js                 # Axios instance + JWT interceptor
├── context/
│   └── AuthContext.js            # Auth state management
├── hooks/
│   ├── use-toast.js             # Toast hook
│   └── useActivityLogger.js     # Activity logger hook
├── lib/
│   └── utils.js                 # Utility functions (cn, formatCurrency, dll)
├── pages/
│   ├── Login.js
│   ├── Dashboard.js
│   ├── BarangList.js            # Master data barang (aset + persediaan tabs)
│   ├── PegawaiList.js           # Data pegawai
│   ├── TransaksiAset.js         # Transaksi aset (5 tab kategori)
│   ├── TransaksiPersediaan.js   # Transaksi persediaan
│   ├── AsetPegawaiList.js       # Tracking aset pegawai
│   ├── GudangList.js            # Manajemen gudang
│   ├── NotificationList.js      # Notifikasi
│   ├── StockOpname.js           # Stock opname
│   ├── StockOpnamePrintView.js  # Print view opname
│   ├── PengamananBMN.js         # Dashboard pengamanan
│   ├── LabelBMN.jsx             # Label BMN (main page)
│   ├── LabelBMN/components/     # Sub-komponen label BMN
│   ├── LaporanInti.jsx          # Laporan inti
│   ├── LaporanRingkas.jsx       # Laporan ringkas
│   ├── LaporanBMN.js            # Laporan BMN
│   ├── Laporan.js               # Laporan posisi/mutasi/kartu
│   ├── Surat.js                 # Persuratan
│   ├── DokumenList.js           # Dokumen sumber
│   ├── ReferensiKode.js         # Referensi kode
│   ├── StrukturOrganisasi.js    # Struktur organisasi
│   ├── BandingData.js           # Banding data
│   ├── Pengaturan.js            # Pengaturan sistem
│   └── activity/
│       ├── ActivityLogPage.jsx  # Log aktivitas
│       └── UserActivityReport.jsx # Laporan per user
├── components/
│   ├── Layout.js                # Sidebar + topbar + main content
│   ├── DeleteMasterDataDialog.js
│   ├── DeleteTransactionDialog.js
│   ├── barang/                  # Komponen barang
│   ├── pegawai/                 # Komponen pegawai
│   ├── transaksi/               # Komponen transaksi (20+ form)
│   ├── surat/                   # Komponen surat
│   ├── kepegawaian/             # Komponen kepegawaian
│   └── ui/                      # shadcn/ui components (50+ komponen)
├── modules/
│   └── kepegawaian/
│       ├── pages/               # Halaman kepegawaian
│       ├── components/          # Komponen kepegawaian (9 files)
│       └── utils/               # Utilitas (perhitunganGaji.js)
```

---

## 6. Koleksi MongoDB

| Collection | Deskripsi |
|---|---|
| `users` | Data user (login, role) |
| `barang` | Data aset tetap/BMN |
| `persediaan` | Data persediaan |
| `pegawai` | Data pegawai |
| `transaksi` | Transaksi aset |
| `transaksi_persediaan` | Transaksi persediaan |
| `stok_batches` | FIFO batch tracking |
| `stock_opname` | Stock opname records |
| `tasks` | Tugas (Kanban) |
| `attendance` | Absensi pegawai |
| `overtime_requests` | Pengajuan lembur individual |
| `overtime_batches` | Batch SPL lembur |
| `overtime_range_batches` | Batch lembur multi-hari |
| `overtime_settings` | Pengaturan tarif lembur |
| `holidays` | Hari libur |
| `kodefikasi` | Referensi kode BMN |
| `dokumen_sumber` | Dokumen sumber (SPM, SP2D, dll) |
| `surat_templates` | Template surat |
| `surat_arsip` | Arsip surat yang di-generate |
| `gudang` | Data gudang |
| `gudang_movements` | Pergerakan barang gudang |
| `aset_pegawai` | Assignment aset ke pegawai |
| `notifications` / `alerts` | Notifikasi & alert |
| `approval_config` | Konfigurasi approval |
| `activity_logs` | Log aktivitas |
| `settings` | Pengaturan sistem |
| `sticker_designs` | Desain stiker label BMN |
| `qr_templates` | Template QR Code |
| `print_logs` | Log pencetakan label |
| `pdf_jobs` | Job PDF generation |
| `child_assets` | Sub-item aset (child) |
| `kib_settings` | Pengaturan KIB |
| `unit_kerja` | Unit kerja organisasi |
| `banks` | Daftar bank |
| `flexi_time_settings` | Pengaturan flexi time |

---

## 7. Ringkasan Statistik Kode

| Kategori | Jumlah File | Perkiraan LOC |
|---|---|---|
| Backend Routes | 28 files | ~12,000+ |
| Backend Models | 4 files | ~1,100 |
| Frontend Pages | 25 files | ~11,400 |
| Frontend Components | 50+ files | ~20,000+ |
| UI Components (shadcn) | 50 files | ~3,000 |
| **Total Estimasi** | **150+ files** | **~47,500+ LOC** |

---

## 8. Catatan Penting

1. **Bahasa UI**: Seluruh antarmuka dalam Bahasa Indonesia
2. **Format Mata Uang**: Rupiah (Rp) dengan formatter `formatCurrency`
3. **Format Tanggal**: ISO (YYYY-MM-DD) di backend, lokal Indonesia di frontend
4. **Autentikasi**: JWT token 30 hari, auto-logout jika 401
5. **PDF**: WeasyPrint di backend (pango library required)
6. **Upload**: File disimpan di `/app/uploads/`, diakses via `/api/uploads/`
7. **CORS**: Allow all origins (dev mode)
8. **Pagination**: Semua list endpoint mendukung `page`, `limit`, `search` parameters
9. **No ObjectID in JSON**: Sebagian besar response menggunakan string ID (meski masih ada beberapa yang menggunakan ObjectId)
