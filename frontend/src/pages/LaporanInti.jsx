/**
 * Laporan Inti BMN - Comprehensive Government Asset Report
 * Optimized A4 Layout with Page Numbers
 */

import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, Shield, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Package, Warehouse } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Compact currency formatter
const compactCurrency = (value) => {
  if (value >= 1e12) return `Rp ${(value/1e12).toFixed(1)}T`;
  if (value >= 1e9) return `Rp ${(value/1e9).toFixed(1)}M`;
  if (value >= 1e6) return `Rp ${(value/1e6).toFixed(0)}Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const COLORS = {
  primary: '#1e3a5f',
  secondary: '#2563eb',
  success: '#16a34a',
  warning: '#ca8a04',
  danger: '#dc2626',
};

const PIE_COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626'];

// ==================== A4 PAGE COMPONENT ====================
const A4Page = ({ children, pageNum, totalPages, header }) => (
  <div className="a4-page bg-white w-[210mm] min-h-[297mm] mx-auto mb-8 shadow-xl print:shadow-none print:mb-0 print:break-after-page relative flex flex-col">
    {/* Compact Header */}
    <header className="bg-slate-900 text-white px-6 py-4 print:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/30 flex-shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-300 uppercase tracking-wider truncate">{header?.kementerian || 'KEMENTERIAN CONTOH REPUBLIK INDONESIA'}</p>
          <h1 className="text-sm font-bold truncate">{header?.direktorat || 'DIREKTORAT JENDERAL PENGELOLAAN ASET'}</h1>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] text-slate-400">No. {header?.nomor_dokumen || 'DOC/BMN/2025/XII/001'}</p>
          <p className="text-xs font-bold bg-blue-700 px-2 py-0.5 rounded inline-block mt-1">TA {header?.tahun_anggaran || new Date().getFullYear()}</p>
        </div>
      </div>
    </header>
    
    {/* Content */}
    <main className="flex-1 px-6 py-4 overflow-hidden">
      {children}
    </main>
    
    {/* Footer with Page Number */}
    <footer className="px-6 py-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 mt-auto">
      <span>LAPORAN BMN - {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
      <span className="font-medium">Halaman {pageNum} dari {totalPages}</span>
    </footer>
  </div>
);

// ==================== SECTION TITLE ====================
const SectionTitle = ({ num, title }) => (
  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-slate-800">
    <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">{num}</span>
    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
  </div>
);

// ==================== COMPACT CARD ====================
const CompactCard = ({ title, items }) => (
  <div className="border border-slate-200 rounded text-[10px]">
    <div className="bg-slate-100 px-2 py-1.5 border-b border-slate-200">
      <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[9px]">{title}</h3>
    </div>
    <div className="divide-y divide-slate-100">
      {items.map((item, idx) => (
        <div key={idx} className={`px-2 py-1.5 flex justify-between items-center ${item.highlight ? 'bg-blue-50' : ''}`}>
          <span className="text-slate-600 truncate pr-2">{item.label}</span>
          <span className={`font-bold whitespace-nowrap ${item.highlight ? 'text-blue-700' : 'text-slate-800'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ==================== COMPACT TABLE ====================
const CompactTable = ({ columns, data, title }) => (
  <div className="border border-slate-200 rounded overflow-hidden text-[9px]">
    {title && (
      <div className="bg-slate-100 px-2 py-1.5 border-b border-slate-200">
        <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[9px]">{title}</h3>
      </div>
    )}
    <table className="w-full">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {columns.map((col, idx) => (
            <th key={idx} className={`px-2 py-1.5 text-[8px] font-bold text-slate-600 uppercase ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.map((row, idx) => (
          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
            {columns.map((col, colIdx) => (
              <td key={colIdx} className={`px-2 py-1 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.bold ? 'font-bold' : ''}`}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ==================== STAT BOX ====================
const StatBox = ({ value, label, sub, color = 'slate', icon: Icon }) => (
  <div className={`text-center p-2 rounded border ${color === 'green' ? 'bg-green-50 border-green-200' : color === 'blue' ? 'bg-blue-50 border-blue-200' : color === 'purple' ? 'bg-purple-50 border-purple-200' : color === 'amber' ? 'bg-amber-50 border-amber-200' : color === 'red' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
    {Icon && <Icon className={`w-4 h-4 mx-auto mb-1 ${color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : color === 'amber' ? 'text-amber-600' : color === 'red' ? 'text-red-600' : 'text-slate-600'}`} />}
    <p className={`text-base font-bold ${color === 'green' ? 'text-green-700' : color === 'blue' ? 'text-blue-700' : color === 'purple' ? 'text-purple-700' : color === 'amber' ? 'text-amber-700' : color === 'red' ? 'text-red-700' : 'text-slate-700'}`}>{value}</p>
    <p className="text-[9px] text-slate-500">{label}</p>
    {sub && <p className="text-[8px] text-slate-400">{sub}</p>}
  </div>
);

// ==================== MAIN COMPONENT ====================
export default function LaporanInti() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/laporan-inti/full-report');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Gagal memuat data laporan');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
        <span className="ml-3 text-slate-500">Memuat Laporan...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  const { ringkasan_eksekutif, rekapitulasi_kategori, kondisi_aset, pelabelan_aset, pengamanan_aset, persediaan, dasar_hukum, header } = data;
  const totalPages = 4;

  return (
    <div className="bg-slate-200 min-h-screen py-8 print:bg-white print:py-0">
      {/* Action Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center no-print shadow-sm mb-4">
        <h1 className="text-base font-bold text-slate-800">Laporan Inti BMN</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Cetak
          </Button>
          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* ==================== PAGE 1 ==================== */}
      <A4Page pageNum={1} totalPages={totalPages} header={header}>
        {/* Document Title */}
        <div className="text-center mb-4 pb-3 border-b-2 border-slate-300">
          <h1 className="text-lg font-bold text-slate-900 uppercase tracking-[0.1em]">LAPORAN BARANG MILIK NEGARA (BMN)</h1>
          <p className="text-[10px] text-slate-500 mt-1">Sesuai PP No. 27 Tahun 2014 tentang Pengelolaan BMN</p>
        </div>

        {/* SECTION I: RINGKASAN EKSEKUTIF */}
        <SectionTitle num="I" title="Ringkasan Eksekutif" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <CompactCard 
            title="Nilai Perolehan"
            items={[
              { label: 'Tanah', value: compactCurrency(ringkasan_eksekutif?.nilai_perolehan?.tanah?.nilai || 0) },
              { label: 'Gedung', value: compactCurrency(ringkasan_eksekutif?.nilai_perolehan?.gedung?.nilai || 0) },
              { label: 'Peralatan', value: compactCurrency(ringkasan_eksekutif?.nilai_perolehan?.peralatan?.nilai || 0) },
              { label: 'Aset Lainnya', value: compactCurrency(ringkasan_eksekutif?.nilai_perolehan?.aset_lainnya?.nilai || 0) },
              { label: 'TOTAL', value: compactCurrency(ringkasan_eksekutif?.nilai_perolehan?.total || 0), highlight: true }
            ]}
          />
          <CompactCard 
            title="Penyusutan"
            items={[
              { label: 'Tahun Berjalan', value: compactCurrency(ringkasan_eksekutif?.penyusutan?.tahun_berjalan || 0) },
              { label: 'Akumulasi', value: compactCurrency(ringkasan_eksekutif?.penyusutan?.akumulasi || 0) },
              { label: 'Metode', value: ringkasan_eksekutif?.penyusutan?.metode || 'Garis Lurus' },
              { label: 'Masa Manfaat', value: ringkasan_eksekutif?.penyusutan?.rata_rata_manfaat || '12.5 Th' }
            ]}
          />
          <CompactCard 
            title="Nilai Buku"
            items={[
              { label: 'Aset Tetap', value: compactCurrency(ringkasan_eksekutif?.nilai_buku?.aset_tetap || 0) },
              { label: 'Tak Berwujud', value: compactCurrency(ringkasan_eksekutif?.nilai_buku?.aset_tak_berwujud || 0) },
              { label: 'Lainnya', value: compactCurrency(ringkasan_eksekutif?.nilai_buku?.aset_lainnya || 0) },
              { label: 'TOTAL', value: compactCurrency(ringkasan_eksekutif?.nilai_buku?.total || 0), highlight: true }
            ]}
          />
        </div>

        {/* SECTION II: REKAPITULASI */}
        <SectionTitle num="II" title="Rekapitulasi per Kategori" />
        <CompactTable 
          title="Klasifikasi BMN"
          columns={[
            { key: 'kategori', header: 'Kategori' },
            { key: 'unit', header: 'Unit', align: 'center' },
            { key: 'perolehan', header: 'Perolehan', align: 'right', render: (v) => compactCurrency(v) },
            { key: 'penyusutan', header: 'Penyusutan', align: 'right', render: (v) => compactCurrency(v) },
            { key: 'nilai_buku', header: 'Nilai Buku', align: 'right', render: (v) => compactCurrency(v), bold: true },
            { key: 'persentase', header: '%', align: 'center', render: (v) => `${v}%` }
          ]}
          data={rekapitulasi_kategori?.data || []}
        />
        <div className="mt-2 bg-slate-100 rounded px-3 py-2 flex justify-between text-[10px] font-bold">
          <span>TOTAL</span>
          <span className="text-blue-700">{compactCurrency(rekapitulasi_kategori?.total?.nilai_buku || 0)} ({(rekapitulasi_kategori?.total?.unit || 0).toLocaleString()} unit)</span>
        </div>

        {/* SECTION III: KONDISI ASET */}
        <SectionTitle num="III" title="Kondisi Aset" />
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Distribusi Kondisi</h4>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kondisi_aset?.distribusi || []} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="count" nameKey="label">
                    {(kondisi_aset?.distribusi || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} unit`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[8px] mt-2">
              {(kondisi_aset?.distribusi || []).map((d, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span>
                  {d.label}: {d.persentase}%
                </span>
              ))}
            </div>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Per Unit Kerja</h4>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(kondisi_aset?.per_unit_kerja || []).slice(0, 5)} layout="vertical">
                  <XAxis type="number" tick={{fontSize: 8}} />
                  <YAxis dataKey="unit" type="category" width={60} tick={{fontSize: 8}} />
                  <Tooltip />
                  <Bar dataKey="baik" name="Baik" stackId="a" fill={COLORS.success} />
                  <Bar dataKey="rusak_ringan" name="RR" stackId="a" fill={COLORS.warning} />
                  <Bar dataKey="rusak_berat" name="RB" stackId="a" fill={COLORS.danger} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </A4Page>

      {/* ==================== PAGE 2 ==================== */}
      <A4Page pageNum={2} totalPages={totalPages} header={header}>
        {/* SECTION IV: VISUALISASI */}
        <SectionTitle num="IV" title="Visualisasi Distribusi & Penyusutan" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Komposisi Nilai Buku</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rekapitulasi_kategori?.data || []} cx="50%" cy="50%" outerRadius={50} dataKey="nilai_buku" nameKey="kategori">
                    {(rekapitulasi_kategori?.data || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => compactCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Akumulasi Penyusutan {new Date().getFullYear()}</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ringkasan_eksekutif?.penyusutan?.tren_bulanan || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nama_bulan" tick={{fontSize: 8}} />
                  <YAxis tickFormatter={(v) => `${(v/1e9).toFixed(0)}M`} tick={{fontSize: 8}} />
                  <Tooltip formatter={(v) => compactCurrency(v)} />
                  <Line type="monotone" dataKey="nilai" stroke={COLORS.primary} strokeWidth={2} dot={{r: 2}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SECTION V: PELABELAN */}
        <SectionTitle num="V" title="Manajemen Pelabelan Aset BMN" />
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatBox value={`${pelabelan_aset?.status_label?.persentase_terlabel || 0}%`} label="Terlabel" sub={`${(pelabelan_aset?.status_label?.terlabel || 0).toLocaleString()} unit`} color="green" icon={CheckCircle} />
          <StatBox value={`${(100 - (pelabelan_aset?.status_label?.persentase_terlabel || 0)).toFixed(1)}%`} label="Belum Label" sub={`${(pelabelan_aset?.status_label?.belum || 0).toLocaleString()} unit`} color="amber" icon={AlertTriangle} />
          <StatBox value={`${pelabelan_aset?.status_cetak?.persentase_tercetak || 0}%`} label="Tercetak" sub={`${(pelabelan_aset?.status_cetak?.tercetak || 0).toLocaleString()} unit`} color="blue" icon={FileText} />
          <StatBox value={pelabelan_aset?.total_rusak || 0} label="Label Rusak" sub="Perlu ganti" color="red" icon={XCircle} />
        </div>

        <CompactTable 
          title="Detail per Kategori"
          columns={[
            { key: 'kategori', header: 'Kategori' },
            { key: 'total', header: 'Total', align: 'center' },
            { key: 'label', header: 'Terlabel', align: 'center' },
            { key: 'belum', header: 'Belum', align: 'center' },
            { key: 'persentase', header: '%', align: 'center', render: (v) => `${v}%` }
          ]}
          data={pelabelan_aset?.detail_per_kategori || []}
        />

        {/* Recommendations */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="text-[9px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Rekomendasi
          </h4>
          <ul className="text-[9px] text-blue-700 space-y-0.5">
            {(pelabelan_aset?.rekomendasi || []).map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>

        {/* SECTION VI: PENGAMANAN */}
        <SectionTitle num="VI" title="Pengamanan Aset BMN" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded p-3 text-center">
            <p className="text-2xl font-bold">{pengamanan_aset?.tertib?.administrasi?.persentase || 0}%</p>
            <p className="text-[10px] text-green-100">Tertib Administrasi</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded p-3 text-center">
            <p className="text-2xl font-bold">{pengamanan_aset?.tertib?.fisik?.persentase || 0}%</p>
            <p className="text-[10px] text-blue-100">Tertib Fisik</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded p-3 text-center">
            <p className="text-2xl font-bold">{pengamanan_aset?.tertib?.hukum?.persentase || 0}%</p>
            <p className="text-[10px] text-purple-100">Tertib Hukum</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3">
          <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Tren Pengamanan (%)</h4>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pengamanan_aset?.tren_pengamanan || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" tick={{fontSize: 8}} />
                <YAxis domain={[0, 100]} tick={{fontSize: 8}} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{fontSize: 8}} />
                <Line type="monotone" dataKey="admin" name="Admin" stroke={COLORS.success} strokeWidth={1.5} dot={{r: 2}} />
                <Line type="monotone" dataKey="fisik" name="Fisik" stroke={COLORS.secondary} strokeWidth={1.5} dot={{r: 2}} />
                <Line type="monotone" dataKey="hukum" name="Hukum" stroke="#8b5cf6" strokeWidth={1.5} dot={{r: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per Unit Kerja Table - Compact */}
        <div className="mt-3">
          <CompactTable 
            title="Status per Unit Kerja"
            columns={[
              { key: 'unit', header: 'Unit' },
              { key: 'total', header: 'Total', align: 'center' },
              { key: 'admin', header: 'Admin', align: 'center', render: (v) => `${v}%` },
              { key: 'fisik', header: 'Fisik', align: 'center', render: (v) => `${v}%` },
              { key: 'hukum', header: 'Hukum', align: 'center', render: (v) => `${v}%` },
              { key: 'overall', header: 'Total', align: 'center', render: (v) => `${v}%`, bold: true }
            ]}
            data={(pengamanan_aset?.per_unit_kerja || []).slice(0, 5)}
          />
        </div>

        {/* Rencana Aksi - Compact */}
        <div className="mt-3">
          <CompactTable 
            title="Rencana Aksi Q1 2025"
            columns={[
              { key: 'kegiatan', header: 'Kegiatan' },
              { key: 'pic', header: 'PIC' },
              { key: 'target', header: 'Target' },
              { key: 'status', header: 'Status', align: 'center', render: (v) => (
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${v === 'Proses' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{v}</span>
              )}
            ]}
            data={(pengamanan_aset?.rencana_aksi || []).slice(0, 3)}
          />
        </div>
      </A4Page>

      {/* ==================== PAGE 3 ==================== */}
      <A4Page pageNum={3} totalPages={totalPages} header={header}>
        {/* SECTION VII: PERSEDIAAN */}
        <SectionTitle num="VII" title="Ringkasan Aset Lancar - Persediaan" />
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatBox value={compactCurrency(persediaan?.nilai_persediaan?.total_nilai || 0)} label="Total Nilai" color="blue" icon={Package} />
          <StatBox value={(persediaan?.nilai_persediaan?.total_item || 0).toLocaleString()} label="Total Item" color="slate" icon={Warehouse} />
          <StatBox value={compactCurrency(persediaan?.mutasi?.masuk?.nilai || 0)} label="Masuk" color="green" icon={TrendingUp} />
          <StatBox value={compactCurrency(persediaan?.mutasi?.keluar?.nilai || 0)} label="Keluar" color="red" icon={TrendingDown} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Distribusi per Kategori</h4>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={persediaan?.distribusi_kategori || []} cx="50%" cy="50%" innerRadius={30} outerRadius={45} dataKey="nilai" nameKey="kategori">
                    {(persediaan?.distribusi_kategori || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => compactCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Tren Mutasi {new Date().getFullYear()}</h4>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={persediaan?.tren_mutasi || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bulan" tick={{fontSize: 8}} />
                  <YAxis tickFormatter={(v) => `${(v/1e6).toFixed(0)}Jt`} tick={{fontSize: 8}} />
                  <Tooltip formatter={(v) => compactCurrency(v)} />
                  <Line type="monotone" dataKey="masuk" name="Masuk" stroke={COLORS.success} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="keluar" name="Keluar" stroke={COLORS.danger} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
          <h4 className="text-[9px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Peringatan Stok Rendah
          </h4>
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-amber-200">
                <th className="text-left py-1 text-amber-700">Kode</th>
                <th className="text-left py-1 text-amber-700">Nama</th>
                <th className="text-center py-1 text-amber-700">Stok</th>
                <th className="text-center py-1 text-amber-700">Min</th>
                <th className="text-center py-1 text-amber-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {(persediaan?.stok_rendah || []).slice(0, 4).map((item, idx) => (
                <tr key={idx} className="border-b border-amber-100">
                  <td className="py-1 font-mono text-[8px]">{item.kode}</td>
                  <td className="py-1">{item.nama}</td>
                  <td className="py-1 text-center font-bold text-red-600">{item.stok}</td>
                  <td className="py-1 text-center">{item.min}</td>
                  <td className="py-1 text-center">
                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${item.status === 'Kritis' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permintaan Per Unit */}
        <div className="border border-slate-200 rounded p-3 mb-3">
          <h4 className="text-[9px] font-bold text-slate-600 uppercase mb-2">Permintaan per Unit</h4>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={persediaan?.permintaan_unit || []} layout="vertical">
                <XAxis type="number" tick={{fontSize: 8}} />
                <YAxis dataKey="unit" type="category" width={60} tick={{fontSize: 8}} />
                <Tooltip />
                <Bar dataKey="total" fill={COLORS.secondary} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gudang Table */}
        <CompactTable 
          title="Kapasitas Gudang"
          columns={[
            { key: 'gudang', header: 'Gudang' },
            { key: 'pic', header: 'PIC' },
            { key: 'item', header: 'Item', align: 'center' },
            { key: 'nilai', header: 'Nilai', align: 'right', render: (v) => compactCurrency(v) },
            { key: 'kapasitas', header: 'Kapasitas', align: 'center', render: (v) => `${v}%` }
          ]}
          data={persediaan?.gudang || []}
        />
      </A4Page>

      {/* ==================== PAGE 4 ==================== */}
      <A4Page pageNum={4} totalPages={totalPages} header={header}>
        {/* SECTION VIII: DASAR HUKUM */}
        <SectionTitle num="VIII" title="Dasar Hukum & Catatan" />
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-700 uppercase mb-2 border-b border-slate-200 pb-1">Dasar Hukum</h4>
            <ul className="space-y-1.5">
              {(dasar_hukum?.dasar_hukum || []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[9px] text-slate-600">
                  <FileText className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <h4 className="text-[9px] font-bold text-slate-700 uppercase mb-2 border-b border-slate-200 pb-1">Catatan Penting</h4>
            <ul className="space-y-1.5">
              {(dasar_hukum?.catatan_penting || []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[9px] text-slate-600">
                  <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-600 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* LEMBAR PENGESAHAN */}
        <div className="border-t-4 border-slate-900 pt-6 mt-auto">
          <h3 className="text-sm font-bold text-center mb-8 uppercase tracking-[0.15em]">Lembar Pengesahan</h3>
          
          <div className="grid grid-cols-3 gap-6">
            {(dasar_hukum?.pengesahan || []).map((sig, idx) => (
              <div key={idx} className="text-center">
                <p className="text-[10px] font-semibold text-slate-600 mb-1">{sig.jabatan}</p>
                <p className="text-[9px] text-slate-400 italic mb-12">Tanda Tangan</p>
                <div className="border-b border-slate-400 mx-4 mb-2"></div>
                <p className="font-bold text-slate-900 text-[11px] uppercase">{sig.nama}</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">NIP. {sig.nip}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-[10px] text-slate-500 mt-8">
            {dasar_hukum?.metadata?.tanggal_cetak || new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
          </p>
        </div>

        {/* Document Footer */}
        <div className="mt-auto pt-4 border-t border-slate-200 text-[8px] text-slate-400 text-center">
          Dokumen ini dibuat secara otomatis oleh Sistem Informasi Manajemen Aset Negara (SIMAN-G) • © {new Date().getFullYear()} Kementerian Contoh RI
        </div>
      </A4Page>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            overflow: hidden !important;
          }
          .a4-page:last-child {
            page-break-after: auto;
          }
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
        }
        @media screen {
          .a4-page {
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
        }
      `}</style>
    </div>
  );
}
