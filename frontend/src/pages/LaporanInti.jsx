/**
 * Laporan Inti BMN - Comprehensive Government Asset Report
 * Based on LAPORAN BARANG MILIK NEGARA format
 * A4 Canvas Layout with Print-friendly Styling
 */

import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, Shield, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Package, Warehouse, Users } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Color palette
const COLORS = {
  primary: '#1e3a5f',
  secondary: '#2563eb',
  success: '#16a34a',
  warning: '#ca8a04',
  danger: '#dc2626',
  info: '#0891b2',
  muted: '#64748b',
  light: '#f1f5f9'
};

const PIE_COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626'];

// ==================== HEADER COMPONENT ====================
const ReportHeader = ({ data }) => {
  const today = new Date();
  
  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white print:bg-white print:text-black print:border-b-4 print:border-slate-900">
      {/* Top Banner */}
      <div className="bg-blue-900 py-1.5 px-8 text-center print:hidden">
        <p className="text-[11px] text-blue-100 tracking-[0.3em] uppercase font-serif">
          Republik Indonesia
        </p>
      </div>
      
      <div className="p-8 print:p-6">
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/30 flex-shrink-0 print:border-slate-900 print:bg-white">
            <Shield className="w-10 h-10 text-white print:text-slate-900" />
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-blue-200 uppercase tracking-wider print:text-slate-600 font-semibold">
              {data?.kementerian || 'KEMENTERIAN CONTOH REPUBLIK INDONESIA'}
            </p>
            <h1 className="text-2xl font-bold mt-1 print:text-slate-900 tracking-wide">
              {data?.direktorat || 'DIREKTORAT JENDERAL PENGELOLAAN ASET'}
            </h1>
            <p className="text-blue-300 text-sm mt-1 print:text-slate-600">
              {data?.alamat || 'Jl. Merdeka Barat No. 15, Jakarta Pusat 10110'}
            </p>
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-blue-300 print:text-slate-500 uppercase tracking-wider">Nomor Dokumen</p>
            <p className="font-mono text-base font-bold print:text-slate-900 mt-1">
              {data?.nomor_dokumen || `DOC/BMN/${today.getFullYear()}/XII/001`}
            </p>
            <div className="mt-3 inline-block bg-blue-800/60 px-4 py-1.5 rounded text-xs text-blue-100 print:text-slate-900 print:border print:border-slate-900 print:bg-white font-semibold">
              TA {data?.tahun_anggaran || today.getFullYear()}
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/20 text-center print:border-slate-300">
          <h2 className="text-3xl font-bold uppercase tracking-[0.15em] print:text-slate-900">
            {data?.judul_laporan || 'LAPORAN BARANG MILIK NEGARA (BMN)'}
          </h2>
          <p className="text-blue-200 mt-3 print:text-slate-600 text-sm">
            {data?.regulasi || 'Sesuai PP No. 27 Tahun 2014 tentang Pengelolaan BMN'}
          </p>
        </div>
      </div>
    </header>
  );
};

// ==================== SECTION COMPONENT ====================
const ReportSection = ({ number, title, description, children, className = '' }) => (
  <section className={`mb-10 break-inside-avoid ${className}`}>
    <div className="mb-6 border-b-2 border-slate-200 pb-3">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-3">
        <span className="bg-slate-900 text-white px-3 py-1 rounded text-sm print:bg-black">
          {number}
        </span>
        {title}
      </h2>
      {description && (
        <p className="text-slate-500 mt-2 text-sm">{description}</p>
      )}
    </div>
    <div>{children}</div>
  </section>
);

// ==================== SUMMARY CARD ====================
const SummaryCard = ({ title, items, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-slate-400 ${className}`}>
    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 print:bg-slate-100">
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
    </div>
    <div className="divide-y divide-slate-100">
      {items.map((item, idx) => (
        <div key={idx} className={`px-5 py-3 flex items-center justify-between ${item.highlight ? 'bg-blue-50' : ''}`}>
          <span className="text-sm text-slate-600">{item.label}</span>
          <div className="text-right">
            <span className={`font-bold ${item.highlight ? 'text-blue-700 text-lg' : 'text-slate-900'}`}>
              {item.value}
            </span>
            {item.subValue && (
              <span className="text-xs text-slate-400 block">{item.subValue}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ==================== DATA TABLE ====================
const DataTable = ({ title, columns, data, showTotal, totalRow }) => (
  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-slate-400">
    {title && (
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 print:bg-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-4 py-2.5 text-slate-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotal && totalRow && (
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
              {totalRow.map((cell, idx) => (
                <td key={idx} className={`px-4 py-3 ${cell.align === 'right' ? 'text-right' : ''} ${cell.className || ''}`}>
                  {cell.value}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
);

// ==================== STATUS INDICATOR ====================
const StatusIndicator = ({ label, value, percentage, color, icon: Icon }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-sm">
    <div className="flex justify-center mb-2">
      {Icon && <Icon className="w-8 h-8" style={{ color }} />}
    </div>
    <p className="text-2xl font-bold" style={{ color }}>{percentage}%</p>
    <p className="text-slate-600 text-sm mt-1">{label}</p>
    <p className="text-xs text-slate-400">{value} unit</p>
  </div>
);

// ==================== PROGRESS BAR ====================
const ProgressBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value} / {total} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export default function LaporanInti() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

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
        <span className="ml-3 text-slate-500">Memuat Laporan Inti...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const { ringkasan_eksekutif, rekapitulasi_kategori, kondisi_aset, pelabelan_aset, pengamanan_aset, persediaan, dasar_hukum, header } = data;

  return (
    <div className="bg-slate-100 min-h-screen print:bg-white">
      {/* Action Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center no-print shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">Laporan Inti BMN</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="bg-white">
            <Printer className="mr-2 h-4 w-4" /> Cetak A4
          </Button>
          <Button className="bg-blue-700 hover:bg-blue-800 text-white">
            <Download className="mr-2 h-4 w-4" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* Main Report Container - A4 Size */}
      <div className="max-w-[210mm] mx-auto my-8 bg-white shadow-2xl print:shadow-none print:my-0 print:max-w-none">
        
        {/* Header */}
        <ReportHeader data={header} />

        {/* Content */}
        <div className="p-10 print:p-8 space-y-12">
          
          {/* ================ SECTION I: RINGKASAN EKSEKUTIF ================ */}
          <ReportSection 
            number="I" 
            title="Ringkasan Eksekutif"
            description="Ikhtisar posisi BMN per akhir periode"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard 
                title="Nilai Perolehan"
                items={[
                  { label: 'Tanah', value: formatCurrency(ringkasan_eksekutif?.nilai_perolehan?.tanah?.nilai || 0), subValue: `${ringkasan_eksekutif?.nilai_perolehan?.tanah?.unit || 0} bidang` },
                  { label: 'Gedung', value: formatCurrency(ringkasan_eksekutif?.nilai_perolehan?.gedung?.nilai || 0), subValue: `${ringkasan_eksekutif?.nilai_perolehan?.gedung?.unit || 0} unit` },
                  { label: 'Peralatan', value: formatCurrency(ringkasan_eksekutif?.nilai_perolehan?.peralatan?.nilai || 0), subValue: `${ringkasan_eksekutif?.nilai_perolehan?.peralatan?.unit || 0} unit` },
                  { label: 'Total', value: formatCurrency(ringkasan_eksekutif?.nilai_perolehan?.total || 0), highlight: true }
                ]}
              />
              <SummaryCard 
                title="Penyusutan"
                items={[
                  { label: 'Tahun Berjalan', value: formatCurrency(ringkasan_eksekutif?.penyusutan?.tahun_berjalan || 0) },
                  { label: 'Akumulasi', value: formatCurrency(ringkasan_eksekutif?.penyusutan?.akumulasi || 0) },
                  { label: 'Metode', value: ringkasan_eksekutif?.penyusutan?.metode || 'Garis Lurus' },
                  { label: 'Rata-rata Manfaat', value: ringkasan_eksekutif?.penyusutan?.rata_rata_manfaat || '12.5 Tahun' }
                ]}
              />
              <SummaryCard 
                title="Nilai Buku"
                items={[
                  { label: 'Aset Tetap', value: formatCurrency(ringkasan_eksekutif?.nilai_buku?.aset_tetap || 0) },
                  { label: 'Aset Tak Berwujud', value: formatCurrency(ringkasan_eksekutif?.nilai_buku?.aset_tak_berwujud || 0) },
                  { label: 'Aset Lainnya', value: formatCurrency(ringkasan_eksekutif?.nilai_buku?.aset_lainnya || 0) },
                  { label: 'Total', value: formatCurrency(ringkasan_eksekutif?.nilai_buku?.total || 0), highlight: true }
                ]}
              />
            </div>
          </ReportSection>

          {/* ================ SECTION II: REKAPITULASI KATEGORI ================ */}
          <ReportSection 
            number="II" 
            title="Rekapitulasi per Kategori"
            description="Pengelompokan BMN berdasarkan klasifikasi"
          >
            <DataTable 
              title="Rekapitulasi BMN"
              columns={[
                { key: 'kategori', header: 'Kategori' },
                { key: 'unit', header: 'Unit', align: 'center' },
                { key: 'perolehan', header: 'Perolehan', align: 'right', render: (v) => formatCurrency(v) },
                { key: 'penyusutan', header: 'Penyusutan', align: 'right', render: (v) => formatCurrency(v), className: 'text-slate-500' },
                { key: 'nilai_buku', header: 'Nilai Buku', align: 'right', render: (v) => formatCurrency(v), className: 'font-bold' },
                { key: 'persentase', header: '%', align: 'center', render: (v) => `${v}%` }
              ]}
              data={rekapitulasi_kategori?.data || []}
              showTotal
              totalRow={[
                { value: 'TOTAL', className: 'font-bold' },
                { value: rekapitulasi_kategori?.total?.unit || 0, align: 'center' },
                { value: formatCurrency(rekapitulasi_kategori?.total?.perolehan || 0), align: 'right' },
                { value: formatCurrency(rekapitulasi_kategori?.total?.penyusutan || 0), align: 'right' },
                { value: formatCurrency(rekapitulasi_kategori?.total?.nilai_buku || 0), align: 'right', className: 'font-bold text-blue-700' },
                { value: '100%', align: 'center' }
              ]}
            />
          </ReportSection>

          {/* ================ SECTION III: KONDISI ASET ================ */}
          <ReportSection 
            number="III" 
            title="Kondisi Aset"
            description="Klasifikasi kondisi BMN"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Distribusi Kondisi</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kondisi_aset?.distribusi || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="label"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {(kondisi_aset?.distribusi || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} unit`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-slate-500 text-sm">Total Aset</p>
                  <p className="text-2xl font-bold text-slate-900">{kondisi_aset?.total_aset || 0} unit</p>
                </div>
              </div>
              
              {/* Condition Notes */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Catatan Kondisi</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-green-800">
                        {kondisi_aset?.distribusi?.find(d => d.label === 'Baik')?.persentase || 0}% Aset dalam Kondisi Baik
                      </p>
                      <p className="text-sm text-green-700 mt-1">Pemeliharaan rutin berjalan sesuai jadwal.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-amber-800">
                        {kondisi_aset?.distribusi?.find(d => d.label === 'Rusak Ringan')?.count || 0} Unit Perlu Perbaikan
                      </p>
                      <p className="text-sm text-amber-700 mt-1">Diusulkan dalam anggaran pemeliharaan TA berikutnya.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-100">
                    <TrendingDown className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">
                        {kondisi_aset?.distribusi?.find(d => d.label === 'Rusak Berat')?.count || 0} Unit Diusulkan Penghapusan
                      </p>
                      <p className="text-sm text-red-700 mt-1">Proses penghapusan sesuai PMK 83/2016.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Condition by Unit */}
            {kondisi_aset?.per_unit_kerja && kondisi_aset.per_unit_kerja.length > 0 && (
              <div className="mt-8 bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Kondisi per Unit Kerja</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kondisi_aset.per_unit_kerja} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="unit" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="baik" name="Baik" stackId="a" fill={COLORS.success} />
                      <Bar dataKey="rusak_ringan" name="Rusak Ringan" stackId="a" fill={COLORS.warning} />
                      <Bar dataKey="rusak_berat" name="Rusak Berat" stackId="a" fill={COLORS.danger} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ReportSection>

          {/* ================ SECTION IV: VISUALISASI ================ */}
          <ReportSection 
            number="IV" 
            title="Visualisasi Distribusi & Penyusutan"
            description="Grafik komposisi nilai dan tren"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Distribution Chart */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Distribusi Nilai Buku</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rekapitulasi_kategori?.data || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="nilai_buku"
                        nameKey="kategori"
                        label={({ kategori, percent }) => `${kategori?.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                      >
                        {(rekapitulasi_kategori?.data || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Depreciation Trend */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Akumulasi Penyusutan {new Date().getFullYear()}</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ringkasan_eksekutif?.penyusutan?.tren_bulanan || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nama_bulan" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}Jt`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="nilai" name="Akumulasi" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </ReportSection>

          {/* ================ SECTION V: PELABELAN ================ */}
          <ReportSection 
            number="V" 
            title="Manajemen Pelabelan Aset BMN"
            description="Status pelabelan, pencetakan, dan kerusakan label"
            className="page-break-before"
          >
            {/* Status Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatusIndicator 
                label="Terlabel" 
                value={pelabelan_aset?.status_label?.terlabel || 0}
                percentage={pelabelan_aset?.status_label?.persentase_terlabel || 0}
                color={COLORS.success}
                icon={CheckCircle}
              />
              <StatusIndicator 
                label="Belum Label" 
                value={pelabelan_aset?.status_label?.belum || 0}
                percentage={(100 - (pelabelan_aset?.status_label?.persentase_terlabel || 0)).toFixed(1)}
                color={COLORS.warning}
                icon={AlertTriangle}
              />
              <StatusIndicator 
                label="Tercetak" 
                value={pelabelan_aset?.status_cetak?.tercetak || 0}
                percentage={pelabelan_aset?.status_cetak?.persentase_tercetak || 0}
                color={COLORS.secondary}
                icon={FileText}
              />
              <StatusIndicator 
                label="Label Rusak" 
                value={pelabelan_aset?.total_rusak || 0}
                percentage={((pelabelan_aset?.total_rusak || 0) / (pelabelan_aset?.status_label?.total || 1) * 100).toFixed(1)}
                color={COLORS.danger}
                icon={XCircle}
              />
            </div>

            {/* Detail per Kategori */}
            <DataTable 
              title="Detail Pelabelan per Kategori"
              columns={[
                { key: 'kategori', header: 'Kategori' },
                { key: 'total', header: 'Total', align: 'center' },
                { key: 'label', header: 'Terlabel', align: 'center', className: 'text-green-600' },
                { key: 'belum', header: 'Belum', align: 'center', className: 'text-amber-600' },
                { key: 'persentase', header: '%', align: 'center', render: (v) => `${v}%` }
              ]}
              data={pelabelan_aset?.detail_per_kategori || []}
            />

            {/* Recommendations */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Rekomendasi
              </h4>
              <ul className="space-y-2">
                {(pelabelan_aset?.rekomendasi || []).map((rek, idx) => (
                  <li key={idx} className="text-blue-700 text-sm flex items-start gap-2">
                    <span className="text-blue-400">•</span> {rek}
                  </li>
                ))}
              </ul>
            </div>
          </ReportSection>

          {/* ================ SECTION VI: PENGAMANAN ================ */}
          <ReportSection 
            number="VI" 
            title="Pengamanan Aset BMN"
            description="Status pengamanan administratif, fisik, dan hukum"
          >
            {/* Status Indicators */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 text-center shadow-lg">
                <p className="text-4xl font-bold">{pengamanan_aset?.tertib?.administrasi?.persentase || 0}%</p>
                <p className="text-green-100 mt-2 font-medium">Tertib Administrasi</p>
                <p className="text-xs text-green-200 mt-1">{pengamanan_aset?.tertib?.administrasi?.count || 0}/{pengamanan_aset?.tertib?.administrasi?.total || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 text-center shadow-lg">
                <p className="text-4xl font-bold">{pengamanan_aset?.tertib?.fisik?.persentase || 0}%</p>
                <p className="text-blue-100 mt-2 font-medium">Tertib Fisik</p>
                <p className="text-xs text-blue-200 mt-1">{pengamanan_aset?.tertib?.fisik?.count || 0}/{pengamanan_aset?.tertib?.fisik?.total || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 text-center shadow-lg">
                <p className="text-4xl font-bold">{pengamanan_aset?.tertib?.hukum?.persentase || 0}%</p>
                <p className="text-purple-100 mt-2 font-medium">Tertib Hukum</p>
                <p className="text-xs text-purple-200 mt-1">{pengamanan_aset?.tertib?.hukum?.count || 0}/{pengamanan_aset?.tertib?.hukum?.total || 0}</p>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
              <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Tren Pengamanan (%)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pengamanan_aset?.tren_pengamanan || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="admin" name="Admin" stroke={COLORS.success} strokeWidth={2} />
                    <Line type="monotone" dataKey="fisik" name="Fisik" stroke={COLORS.secondary} strokeWidth={2} />
                    <Line type="monotone" dataKey="hukum" name="Hukum" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per Unit Kerja */}
            <DataTable 
              title="Status per Unit Kerja"
              columns={[
                { key: 'unit', header: 'Unit' },
                { key: 'total', header: 'Total', align: 'center' },
                { key: 'admin', header: 'Admin (%)', align: 'center', render: (v) => `${v}%` },
                { key: 'fisik', header: 'Fisik (%)', align: 'center', render: (v) => `${v}%` },
                { key: 'hukum', header: 'Hukum (%)', align: 'center', render: (v) => `${v}%` },
                { key: 'overall', header: 'Total (%)', align: 'center', render: (v) => `${v}%`, className: 'font-bold' }
              ]}
              data={pengamanan_aset?.per_unit_kerja || []}
            />

            {/* Rencana Aksi */}
            <div className="mt-6">
              <DataTable 
                title="Rencana Aksi Q1 2025"
                columns={[
                  { key: 'no', header: 'No', align: 'center' },
                  { key: 'kegiatan', header: 'Kegiatan' },
                  { key: 'pic', header: 'PIC' },
                  { key: 'target', header: 'Target' },
                  { key: 'status', header: 'Status', align: 'center', render: (v) => (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${v === 'Proses' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {v}
                    </span>
                  )}
                ]}
                data={pengamanan_aset?.rencana_aksi || []}
              />
            </div>
          </ReportSection>

          {/* ================ SECTION VII: PERSEDIAAN ================ */}
          <ReportSection 
            number="VII" 
            title="Ringkasan Aset Lancar - Persediaan"
            description={`Ikhtisar nilai persediaan per ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`}
            className="page-break-before"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(persediaan?.nilai_persediaan?.total_nilai || 0)}</p>
                <p className="text-slate-500 text-sm">Total Nilai</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <Warehouse className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">{persediaan?.nilai_persediaan?.total_item || 0}</p>
                <p className="text-slate-500 text-sm">Total Item</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(persediaan?.mutasi?.masuk?.nilai || 0)}</p>
                <p className="text-slate-500 text-sm">Masuk</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{formatCurrency(persediaan?.mutasi?.keluar?.nilai || 0)}</p>
                <p className="text-slate-500 text-sm">Keluar</p>
              </div>
            </div>

            {/* Distribution & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Distribution Pie */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Distribusi Nilai per Kategori</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={persediaan?.distribusi_kategori || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="nilai"
                        nameKey="kategori"
                        label={({ kategori, persentase }) => `${kategori} ${persentase}%`}
                      >
                        {(persediaan?.distribusi_kategori || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mutation Trend */}
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Tren Mutasi {new Date().getFullYear()}</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={persediaan?.tren_mutasi || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bulan" />
                      <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}Jt`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="masuk" name="Penerimaan" stroke={COLORS.success} strokeWidth={2} />
                      <Line type="monotone" dataKey="keluar" name="Pengeluaran" stroke={COLORS.danger} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Low Stock Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
              <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Peringatan Stok Rendah
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-2 px-3 text-amber-700">Kode</th>
                      <th className="text-left py-2 px-3 text-amber-700">Nama</th>
                      <th className="text-center py-2 px-3 text-amber-700">Stok</th>
                      <th className="text-center py-2 px-3 text-amber-700">Min</th>
                      <th className="text-center py-2 px-3 text-amber-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(persediaan?.stok_rendah || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-amber-100">
                        <td className="py-2 px-3 font-mono text-xs">{item.kode}</td>
                        <td className="py-2 px-3">{item.nama}</td>
                        <td className="py-2 px-3 text-center font-bold text-red-600">{item.stok}</td>
                        <td className="py-2 px-3 text-center">{item.min}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.status === 'Kritis' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Request per Unit Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase">Permintaan per Unit</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={persediaan?.permintaan_unit || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="unit" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total Permintaan" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ReportSection>

          {/* ================ SECTION VIII: DASAR HUKUM ================ */}
          <ReportSection 
            number="VIII" 
            title="Dasar Hukum & Catatan"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Legal Basis */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 uppercase text-sm border-b border-slate-200 pb-2">Dasar Hukum</h4>
                <ul className="space-y-3">
                  {(dasar_hukum?.dasar_hukum || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h4 className="font-bold text-slate-800 mb-4 uppercase text-sm border-b border-slate-200 pb-2">Catatan Penting</h4>
                <ul className="space-y-3">
                  {(dasar_hukum?.catatan_penting || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Signature Section */}
            <div className="border-t-4 border-slate-900 pt-10">
              <h3 className="text-lg font-bold text-center mb-10 uppercase tracking-[0.2em]">Lembar Pengesahan</h3>
              <div className="grid grid-cols-3 gap-8">
                {(dasar_hukum?.pengesahan || []).map((sig, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-sm font-semibold text-slate-600 mb-1">{sig.jabatan}</p>
                    <p className="text-xs text-slate-400 italic mb-12">Tanda Tangan</p>
                    <div className="border-b border-slate-300 mx-8 mb-2"></div>
                    <p className="font-bold text-slate-900 text-sm uppercase">{sig.nama}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">NIP. {sig.nip}</p>
                    <p className="text-xs text-slate-400 mt-2">{dasar_hukum?.metadata?.tanggal_cetak}</p>
                  </div>
                ))}
              </div>
            </div>
          </ReportSection>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
            <div>
              Dokumen ini dibuat secara otomatis oleh sistem SIMAN-G
            </div>
            <div>
              Dicetak: {new Date().toLocaleString('id-ID')} • © {new Date().getFullYear()} Kementerian Contoh RI
            </div>
          </footer>

        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .page-break-before { page-break-before: always; }
          @page { 
            size: A4; 
            margin: 10mm; 
          }
        }
      `}</style>
    </div>
  );
}
