import React from 'react';

export const KOP_STYLES = {
    standard: {
        id: 'standard',
        name: 'Standard Pemerintahan (Garis Ganda)',
        render: (instansi) => `
            <div class="kop-surat standard">
                <div class="logo-container">
                    ${instansi.logo_url ? `<img src="${instansi.logo_url}" alt="Logo" />` : ''}
                </div>
                <div class="text-container">
                    <h3 class="pemerintah">PEMERINTAH REPUBLIK INDONESIA</h3>
                    <h2 class="instansi">${instansi.nama_instansi || 'NAMA INSTANSI'}</h2>
                    <p class="alamat">${instansi.alamat || 'Alamat Instansi'}</p>
                    <p class="kontak">Telp: ${instansi.telepon || '-'} | Email: ${instansi.email || '-'}</p>
                </div>
                <div style="clear: both;"></div>
                <div class="double-line"></div>
            </div>
        `,
        css: `
            .kop-surat.standard { text-align: center; margin-bottom: 20px; position: relative; width: 100%; }
            .kop-surat.standard .logo-container { position: absolute; left: 0; top: 0; width: 80px; height: 80px; }
            .kop-surat.standard .logo-container img { width: 100%; height: 100%; object-fit: contain; }
            .kop-surat.standard .text-container { padding: 0 90px; } 
            .kop-surat.standard h3.pemerintah { margin: 0; font-size: 12pt; font-weight: normal; letter-spacing: 1px; }
            .kop-surat.standard h2.instansi { margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; }
            .kop-surat.standard p.alamat { margin: 5px 0 0 0; font-size: 9pt; }
            .kop-surat.standard p.kontak { margin: 0; font-size: 8pt; }
            .kop-surat.standard .double-line { margin-top: 10px; border-top: 3px solid black; border-bottom: 1px solid black; height: 3px; }
        `
    },
    custom: {
        id: 'custom',
        name: 'Custom Design (HTML/CSS Manual)',
        render: (instansi, customHtml) => customHtml || `
            <!-- CONTOH KOP CUSTOM -->
            <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-weight: bold; font-size: 20px;">${instansi.nama_instansi || 'INSTANSI ANDA'}</div>
                <div style="text-align: right; font-size: 10px;">
                    ${instansi.alamat || 'Alamat'}<br/>
                    ${instansi.email || 'Email'}
                </div>
            </div>
        `,
        css: ''
    }
};

const COMMON_CSS = `
/* GLOBAL RESET & PRINT SETUP */
@page { margin: 1.5cm; size: A4; }
body { -webkit-print-color-adjust: exact; font-family: 'Arial', sans-serif; font-size: 10pt; color: #000; }

/* LAYOUT HELPERS */
.page-break { page-break-before: always; }
.text-center { text-align: center; }
.text-justify { text-align: justify; }
.text-right { text-align: right; }
.text-bold { font-weight: bold; }
.uppercase { text-transform: uppercase; }
.mb-1 { margin-bottom: 5px; }
.mb-2 { margin-bottom: 10px; }
.mb-4 { margin-bottom: 20px; }
.mt-4 { margin-top: 20px; }

/* TABLE STYLES (COMPACT) */
table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }
table.data-table th, table.data-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
table.data-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }

/* SIGNATURE GRID */
.ttd-container { display: table; width: 100%; margin-top: 30px; page-break-inside: avoid; }
.ttd-row { display: table-row; }
.ttd-col { display: table-cell; width: 33%; text-align: center; vertical-align: top; padding: 0 10px; }
.ttd-space { height: 70px; }
.ttd-name { font-weight: bold; text-decoration: underline; margin-bottom: 2px; }
.ttd-nip { font-size: 9pt; }

/* FOOTER PAGE NUMBER */
.footer-page { position: fixed; bottom: 0; right: 0; font-size: 8pt; color: #666; }
.footer-page:after { content: "Halaman " counter(page); }
`;

export const EXAMPLE_TEMPLATES = {
    sppb: {
        name: "SPPB (Surat Permintaan Pengeluaran Barang)",
        jenis: "SPK",
        css: `
${COMMON_CSS}
.header-sppb { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
.header-table { width: 100%; border: none; margin-bottom: 0; }
.header-table td { border: none; padding: 2px; font-size: 10pt; }
.judul-besar { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
.nomor-surat { text-align: center; font-size: 11pt; margin-bottom: 20px; }
        `,
        html: `
<div class="judul-besar">SURAT PERMINTAAN PENGELUARAN BARANG (SPPB)</div>
<div class="nomor-surat">Nomor: {{ nomor_surat }}</div>

<div class="header-sppb">
    <table class="header-table">
        <tr>
            <td width="15%"><strong>Dari</strong></td>
            <td width="2%">:</td>
            <td width="33%">[Unit Peminta]</td>
            <td width="15%"><strong>Tanggal</strong></td>
            <td width="2%">:</td>
            <td>{{ tanggal }}</td>
        </tr>
        <tr>
            <td><strong>Kepada</strong></td>
            <td>:</td>
            <td>Gudang Persediaan</td>
            <td><strong>Perihal</strong></td>
            <td>:</td>
            <td>{{ perihal }}</td>
        </tr>
    </table>
</div>

<p class="mb-2">Harap dikeluarkan barang-barang tersebut di bawah ini untuk keperluan dinas:</p>

<table class="data-table">
    <thead>
        <tr>
            <th width="5%">No</th>
            <th width="15%">Kode Barang</th>
            <th width="35%">Nama Barang / Spesifikasi</th>
            <th width="10%">Satuan</th>
            <th width="10%">Jml Minta</th>
            <th width="10%">Jml Setuju</th>
            <th width="15%">Keterangan</th>
        </tr>
    </thead>
    <tbody>
        <!-- Contoh Data Statis (Nanti diganti variabel {{ daftar_barang }}) -->
        <tr>
            <td class="text-center">1</td>
            <td class="text-center">1010301001</td>
            <td>Kertas HVS A4 80gr</td>
            <td class="text-center">Rim</td>
            <td class="text-center">10</td>
            <td class="text-center">10</td>
            <td>Segera</td>
        </tr>
        <tr>
            <td class="text-center">2</td>
            <td class="text-center">1010302005</td>
            <td>Tinta Printer HP 85A</td>
            <td class="text-center">Buah</td>
            <td class="text-center">5</td>
            <td class="text-center">5</td>
            <td>-</td>
        </tr>
        <tr>
            <td class="text-center">3</td>
            <td class="text-center">1010305001</td>
            <td>Ballpoint Standard</td>
            <td class="text-center">Lusin</td>
            <td class="text-center">2</td>
            <td class="text-center">2</td>
            <td>Hitam</td>
        </tr>
        <!-- Baris kosong pelengkap layout A4 -->
        <tr><td class="text-center">4</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        <tr><td class="text-center">5</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
</table>

<div class="ttd-container">
    <div class="ttd-row">
        <div class="ttd-col">
            <p>Yang Meminta,</p>
            <p>[Jabatan Peminta]</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">[Nama Peminta]</p>
            <p class="ttd-nip">NIP. ....................</p>
        </div>
        <div class="ttd-col">
            <p>Menyetujui,</p>
            <p>Pejabat Penatausahaan</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">{{ ttd_nama }}</p>
            <p class="ttd-nip">NIP. {{ ttd_nip }}</p>
        </div>
        <div class="ttd-col">
            <p>Yang Menyerahkan,</p>
            <p>Petugas Gudang</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">[Nama Petugas]</p>
            <p class="ttd-nip">NIP. ....................</p>
        </div>
    </div>
</div>

<div class="footer-page"></div>
        `
    },
    lpb: {
        name: "LPB (Laporan Penerimaan Barang)",
        jenis: "BAST",
        css: `
${COMMON_CSS}
.info-box { border: 1px solid #000; padding: 5px; margin-bottom: 10px; font-size: 9pt; }
.judul-dokumen { text-align: center; font-weight: bold; font-size: 14pt; border: 2px solid #000; padding: 5px; margin-bottom: 10px; background: #eee; }
        `,
        html: `
<div class="judul-dokumen">LAPORAN PENERIMAAN BARANG (LPB)</div>

<table style="width: 100%; margin-bottom: 15px; font-size: 10pt;">
    <tr>
        <td width="15%">No. Dokumen</td>
        <td width="35%">: <strong>{{ nomor_surat }}</strong></td>
        <td width="15%">Terima Dari</td>
        <td width="35%">: [Nama Penyedia / Toko]</td>
    </tr>
    <tr>
        <td>Tanggal</td>
        <td>: {{ tanggal }}</td>
        <td>No. Faktur/SJ</td>
        <td>: [No Referensi]</td>
    </tr>
    <tr>
        <td>No. Kontrak/SPK</td>
        <td>: [No Kontrak]</td>
        <td>Program</td>
        <td>: [Nama Program/Kegiatan]</td>
    </tr>
</table>

<table class="data-table">
    <thead>
        <tr>
            <th width="5%">No</th>
            <th width="30%">Nama Barang</th>
            <th width="10%">Satuan</th>
            <th width="10%">Jumlah</th>
            <th width="15%">Harga Satuan (Rp)</th>
            <th width="15%">Total Harga (Rp)</th>
            <th width="15%">Kondisi</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="text-center">1</td>
            <td>Laptop ASUS Core i5</td>
            <td class="text-center">Unit</td>
            <td class="text-center">2</td>
            <td class="text-right">12.000.000</td>
            <td class="text-right">24.000.000</td>
            <td class="text-center">Baik/Baru</td>
        </tr>
        <tr>
            <td class="text-center">2</td>
            <td>Printer Epson L3110</td>
            <td class="text-center">Unit</td>
            <td class="text-center">1</td>
            <td class="text-right">2.500.000</td>
            <td class="text-right">2.500.000</td>
            <td class="text-center">Baik/Baru</td>
        </tr>
        <!-- Total Row -->
        <tr>
            <td colspan="5" class="text-right text-bold">GRAND TOTAL</td>
            <td class="text-right text-bold">26.500.000</td>
            <td></td>
        </tr>
    </tbody>
</table>

<p class="mb-4 text-justify" style="font-size: 9pt;">
    Barang-barang tersebut di atas telah diterima dengan baik dan cukup jumlahnya sesuai dengan pesanan/kontrak, 
    dan telah dicatat dalam Buku Penerimaan Barang.
</p>

<div class="ttd-container">
    <div class="ttd-row">
        <div class="ttd-col">
            <p>Penyedia Barang,</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">[Nama Rekanan]</p>
            <p class="ttd-nip">Direktur/Pimpinan</p>
        </div>
        <div class="ttd-col">
            <p>Panitia Pemeriksa,</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">[Nama Pemeriksa]</p>
            <p class="ttd-nip">NIP. ....................</p>
        </div>
        <div class="ttd-col">
            <p>Penyimpan Barang,</p>
            <div class="ttd-space"></div>
            <p class="ttd-name">{{ ttd_nama }}</p>
            <p class="ttd-nip">NIP. {{ ttd_nip }}</p>
        </div>
    </div>
</div>

<div class="footer-page"></div>
        `
    },
    bast_full: {
        name: "BAST Full Page (Berita Acara Serah Terima)",
        jenis: "BAST",
        css: `
${COMMON_CSS}
.judul-ba { text-align: center; margin-bottom: 20px; }
.judul-ba h3 { margin: 0; text-decoration: underline; font-size: 12pt; }
.judul-ba p { margin: 2px 0; font-size: 10pt; }
.pihak-wrapper { margin-left: 20px; margin-bottom: 15px; }
.pihak-label { font-weight: bold; margin-bottom: 5px; }
        `,
        html: `
<div class="judul-ba">
    <h3>BERITA ACARA SERAH TERIMA BARANG</h3>
    <p>NOMOR: {{ nomor_surat }}</p>
</div>

<p class="text-justify mb-2">
    Pada hari ini <strong>[Hari]</strong> tanggal <strong>[Tanggal Terbilang]</strong> bulan <strong>[Bulan]</strong> tahun <strong>[Tahun]</strong>, 
    kami yang bertanda tangan di bawah ini:
</p>

<div class="pihak-wrapper">
    <div class="pihak-label">I. PIHAK PERTAMA (Yang Menyerahkan):</div>
    <table style="width: 100%;">
        <tr><td width="100">Nama</td><td>: [Nama Pihak 1]</td></tr>
        <tr><td>NIP/Jabatan</td><td>: [NIP/Jabatan]</td></tr>
        <tr><td>Alamat</td><td>: [Alamat]</td></tr>
    </table>
</div>

<div class="pihak-wrapper">
    <div class="pihak-label">II. PIHAK KEDUA (Yang Menerima):</div>
    <table style="width: 100%;">
        <tr><td width="100">Nama</td><td>: {{ ttd_nama }}</td></tr>
        <tr><td>NIP</td><td>: {{ ttd_nip }}</td></tr>
        <tr><td>Jabatan</td><td>: {{ ttd_jabatan }}</td></tr>
    </table>
</div>

<p class="text-justify mb-2">
    PIHAK PERTAMA menyerahkan barang kepada PIHAK KEDUA, dan PIHAK KEDUA menerima barang tersebut dari PIHAK PERTAMA 
    dengan rincian sebagai berikut:
</p>

<table class="data-table">
    <thead>
        <tr>
            <th width="5%">No</th>
            <th width="40%">Nama / Jenis Barang</th>
            <th width="15%">Merk/Tipe</th>
            <th width="10%">Tahun</th>
            <th width="10%">Jumlah</th>
            <th width="20%">Harga Total</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="text-center">1</td>
            <td>Sepeda Motor Dinas</td>
            <td>Honda Vario</td>
            <td class="text-center">2024</td>
            <td class="text-center">1 Unit</td>
            <td class="text-right">25.000.000</td>
        </tr>
        <!-- Item lainnya -->
    </tbody>
</table>

<p class="text-justify mb-4">
    Sejak penandatanganan Berita Acara ini, maka tanggung jawab pengurusan dan pemeliharaan barang tersebut beralih 
    dari PIHAK PERTAMA kepada PIHAK KEDUA.
</p>

<div class="ttd-container">
    <div class="ttd-row">
        <div class="ttd-col">
            <p>PIHAK KEDUA</p>
            <p>Yang Menerima,</p>
            <div class="ttd-space">
                <!-- Placeholder TTD -->
            </div>
            <p class="ttd-name">{{ ttd_nama }}</p>
            <p class="ttd-nip">NIP. {{ ttd_nip }}</p>
        </div>
        <div class="ttd-col">
            <!-- Space Tengah (Saksi jika ada) -->
        </div>
        <div class="ttd-col">
            <p>PIHAK PERTAMA</p>
            <p>Yang Menyerahkan,</p>
            <div class="ttd-space">
                <!-- Placeholder TTD -->
            </div>
            <p class="ttd-name">[Nama Pihak 1]</p>
            <p class="ttd-nip">[NIP Pihak 1]</p>
        </div>
    </div>
</div>

<div class="footer-page"></div>
        `
    }
};
