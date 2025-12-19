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
            .kop-surat.standard { text-align: center; margin-bottom: 30px; position: relative; }
            .kop-surat.standard .logo-container { position: absolute; left: 0; top: 0; width: 80px; height: 80px; }
            .kop-surat.standard .logo-container img { width: 100%; height: auto; object-fit: contain; }
            .kop-surat.standard .text-container { padding-left: 0px; } 
            .kop-surat.standard h3.pemerintah { margin: 0; font-size: 14pt; font-weight: normal; }
            .kop-surat.standard h2.instansi { margin: 0; font-size: 18pt; font-weight: bold; text-transform: uppercase; }
            .kop-surat.standard p.alamat { margin: 5px 0 0 0; font-size: 10pt; }
            .kop-surat.standard p.kontak { margin: 0; font-size: 9pt; }
            .kop-surat.standard .double-line { margin-top: 15px; border-top: 3px solid black; border-bottom: 1px solid black; height: 3px; }
        `
    },
    modern: {
        id: 'modern',
        name: 'Modern Clean (Blue Accent)',
        render: (instansi) => `
            <div class="kop-surat modern">
                <div class="bar-accent"></div>
                <div class="content">
                    <h2 class="instansi">${instansi.nama_instansi || 'NAMA INSTANSI'}</h2>
                    <p class="alamat">${instansi.alamat || 'Alamat Instansi'}</p>
                    <div class="meta">
                        <span>Telp: ${instansi.telepon || '-'}</span>
                        <span>Web: ${instansi.website || '-'}</span>
                    </div>
                </div>
            </div>
        `,
        css: `
            .kop-surat.modern { display: flex; margin-bottom: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
            .kop-surat.modern .bar-accent { width: 8px; background-color: #2563eb; margin-right: 20px; border-radius: 4px; }
            .kop-surat.modern .content { flex: 1; }
            .kop-surat.modern h2.instansi { margin: 0; color: #1e293b; font-size: 20pt; font-family: sans-serif; font-weight: 800; }
            .kop-surat.modern p.alamat { margin: 5px 0; color: #64748b; font-family: sans-serif; }
            .kop-surat.modern .meta { font-size: 9pt; color: #94a3b8; font-family: sans-serif; display: flex; gap: 15px; }
        `
    },
    simple: {
        id: 'simple',
        name: 'Simple Minimalist (Left Aligned)',
        render: (instansi) => `
            <div class="kop-surat simple">
                <h2 class="instansi">${instansi.nama_instansi || 'NAMA INSTANSI'}</h2>
                <div class="divider"></div>
                <p class="info">${instansi.alamat || 'Alamat'} | ${instansi.telepon || '-'}</p>
            </div>
        `,
        css: `
            .kop-surat.simple { margin-bottom: 30px; }
            .kop-surat.simple h2.instansi { margin: 0; font-size: 16pt; font-weight: bold; font-family: 'Arial', sans-serif; color: #333; }
            .kop-surat.simple .divider { width: 50px; height: 4px; background: #333; margin: 10px 0; }
            .kop-surat.simple .info { font-size: 10pt; color: #666; font-family: 'Arial', sans-serif; }
        `
    },
    none: {
        id: 'none',
        name: 'Tanpa Kop Surat (Kosong)',
        render: () => '',
        css: ''
    }
};

export const EXAMPLE_TEMPLATES = {
    surat_tugas: {
        name: "Surat Perintah Tugas Professional",
        jenis: "SPK",
        css: `
/* Layout Utama */
.surat-container {
    font-family: 'Bookman Old Style', serif;
    line-height: 1.6;
    color: #000;
}

/* Judul Surat */
.judul-surat {
    text-align: center;
    margin: 30px 0;
}
.judul-surat h3 {
    text-decoration: underline;
    font-size: 16pt;
    font-weight: bold;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.judul-surat p {
    margin: 5px 0 0 0;
    font-size: 11pt;
}

/* Paragraf & Indentasi */
.paragraf-pembuka {
    text-align: justify;
    margin-bottom: 20px;
}

/* Tabel Data Pegawai */
.tabel-data {
    width: 100%;
    margin-left: 20px;
    border-collapse: collapse;
}
.tabel-data td {
    vertical-align: top;
    padding: 2px 5px;
}
.label-col {
    width: 150px;
    font-weight: bold;
}
.separator-col {
    width: 10px;
}

/* Bagian Menimbang/Mengingat (Konsiderans) */
.konsiderans {
    margin-bottom: 20px;
}
.konsiderans-row {
    display: flex;
    margin-bottom: 5px;
}
.konsiderans-label {
    width: 100px;
    font-weight: bold;
    font-style: italic;
}
.konsiderans-content {
    flex: 1;
}

/* Tanda Tangan Grid */
.ttd-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 50px;
    page-break-inside: avoid;
}
.ttd-box {
    text-align: center;
    padding: 10px;
}
.ttd-kiri {
    /* Kosong atau Tanda Tangan Mengetahui */
}
.ttd-kanan {
    /* Tanda Tangan Utama */
}
.ttd-jabatan {
    font-size: 11pt;
    margin-bottom: 70px; /* Space untuk TTD */
}
.ttd-nama {
    font-weight: bold;
    text-decoration: underline;
    font-size: 11pt;
}
.ttd-nip {
    font-size: 10pt;
}
        `,
        html: `
<div class="surat-container">
    <div class="judul-surat">
        <h3>SURAT PERINTAH TUGAS</h3>
        <p>Nomor: {{ nomor_surat }}</p>
    </div>

    <div class="konsiderans">
        <div class="konsiderans-row">
            <div class="konsiderans-label">Menimbang</div>
            <div class="konsiderans-content">: a. Bahwa dalam rangka pelaksanaan kegiatan dinas, dipandang perlu menugaskan pegawai;</div>
        </div>
        <div class="konsiderans-row">
            <div class="konsiderans-label">Dasar</div>
            <div class="konsiderans-content">: 1. Peraturan Menteri Keuangan Nomor ...<br/>: 2. DIPA Tahun Anggaran {{ tahun_anggaran }}</div>
        </div>
    </div>

    <div style="text-align: center; margin: 20px 0; font-weight: bold;">MEMBERI PERINTAH:</div>

    <div class="paragraf-pembuka">
        Kepada Pegawai Negeri Sipil tersebut di bawah ini:
    </div>

    <table class="tabel-data">
        <tr>
            <td class="label-col">Nama</td>
            <td class="separator-col">:</td>
            <td>{{ kepada }}</td>
        </tr>
        <tr>
            <td class="label-col">Jabatan</td>
            <td class="separator-col">:</td>
            <td>[Jabatan Pegawai]</td>
        </tr>
        <tr>
            <td class="label-col">Untuk</td>
            <td class="separator-col">:</td>
            <td>Melaksanakan tugas dalam rangka {{ perihal }} yang akan dilaksanakan pada tanggal {{ tanggal }}.</td>
        </tr>
    </table>

    <div class="paragraf-pembuka" style="margin-top: 20px;">
        Demikian Surat Perintah ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.
    </div>

    <div class="ttd-container">
        <div class="ttd-box ttd-kiri">
            <!-- Space Kiri Kosong -->
        </div>
        <div class="ttd-box ttd-kanan">
            <p>Ditetapkan di: [Kota]</p>
            <p>Pada tanggal: {{ tanggal }}</p>
            <p class="ttd-jabatan">{{ ttd_jabatan }}</p>
            
            <!-- Area Tanda Tangan -->
            <div style="height: 20px;">
                 {{ ttd_image }}
            </div>

            <p class="ttd-nama">{{ ttd_nama }}</p>
            <p class="ttd-nip">NIP. {{ ttd_nip }}</p>
        </div>
    </div>
</div>
        `
    }
};
