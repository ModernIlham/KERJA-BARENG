/**
 * Laporan Ringkas BMN - Executive Summary 1 Halaman A4
 * Full Report tanpa Tanda Tangan
 */

import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Building2, Package, Wrench, MapPin, Construction, BookOpen, FileText, Car, Laptop, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const fc = (v) => {
  if (!v || v === 0) return 'Rp 0';
  if (v >= 1e12) return `Rp ${(v/1e12).toFixed(2)}T`;
  if (v >= 1e9) return `Rp ${(v/1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v/1e6).toFixed(0)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const fn = (v) => v ? v.toLocaleString('id-ID') : '0';

const COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed'];

// Mini Stat Card
const MiniStat = ({ label, value, color = 'slate', icon: Icon }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200'
  };
  return (
    <div className={`rounded border p-1 text-center ${colors[color]}`}>
      {Icon && <Icon className="w-3 h-3 mx-auto mb-0.5 opacity-70" />}
      <p className="text-[9px] font-bold whitespace-nowrap overflow-visible">{value}</p>
      <p className="text-[5px] text-slate-500 uppercase">{label}</p>
    </div>
  );
};

export default function LaporanRingkas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef(null);

  useEffect(() => {
    api.get('/api/laporan-inti/ringkas')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>;
  if (!data) return <div className="flex justify-center items-center min-h-screen text-red-500">Gagal memuat data</div>;

  const { header, ikhtisar_bmn: ib, kondisi_aset: ka, pengamanan: pg, pelabelan: pl, highlight: hl } = data;
  const at = ib.aset_tetap;

  // Prepare chart data
  const pieData = at.breakdown.map((item, i) => ({ name: item.nama, value: item.nilai, color: COLORS[i % COLORS.length] }));
  
  const kondisiData = [
    { name: 'Baik', value: ka?.baik_persen || 85, color: '#16a34a' },
    { name: 'RR', value: ka?.rusak_ringan_persen || 10, color: '#ca8a04' },
    { name: 'RB', value: ka?.rusak_berat_persen || 5, color: '#dc2626' }
  ];

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await api.get('/api/laporan-inti/ringkas/pdf', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan_ringkas_bmn_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="print-container bg-slate-200 min-h-screen py-6">
      {/* Action Bar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 shadow-sm mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-sm font-bold text-slate-800">📋 Laporan Ringkas BMN</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-3 w-3" />Cetak Browser</Button>
            <Button size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf}>
              {downloadingPdf ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileText className="mr-1 h-3 w-3" />}
              {downloadingPdf ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">💡 Gunakan "Download PDF" untuk hasil cetak terbaik dengan WeasyPrint</p>
      </div>

      {/* Single A4 Page */}
      <div ref={reportRef} className="a4-page bg-white mx-auto shadow-xl relative flex flex-col">
        
        {/* Header - Compact */}
        <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/30">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-[7px] text-slate-300 uppercase tracking-wider">{header?.kementerian}</p>
              <h1 className="text-[9px] font-bold">{header?.direktorat}</h1>
            </div>
            <div className="text-right">
              <span className="text-[7px] font-bold bg-blue-600 px-1.5 py-0.5 rounded">TA {header?.tahun_anggaran}</span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-white/20 text-center">
            <h2 className="text-[11px] font-bold uppercase tracking-wide">RINGKASAN EKSEKUTIF LAPORAN BMN</h2>
            <p className="text-[7px] text-slate-300">One-Page Executive Summary • {header?.tanggal}</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-3 py-2 text-[7px]">
          
          {/* GRAND TOTAL ROW */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded p-2 mb-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="border-r border-white/20">
                <p className="text-[6px] text-blue-200 uppercase">Total Perolehan</p>
                <p className="text-sm font-bold">{fc(ib.grand_total_perolehan)}</p>
              </div>
              <div className="border-r border-white/20">
                <p className="text-[6px] text-blue-200 uppercase">Total Nilai Buku</p>
                <p className="text-sm font-bold">{fc(ib.grand_total_buku)}</p>
              </div>
              <div className="border-r border-white/20">
                <p className="text-[6px] text-blue-200 uppercase">Total Unit</p>
                <p className="text-sm font-bold">{fn(at.total_unit + (ib.persediaan?.total_item || 0))}</p>
              </div>
              <div>
                <p className="text-[6px] text-blue-200 uppercase">Akumulasi Penyusutan</p>
                <p className="text-sm font-bold">{fc((ib.grand_total_perolehan || 0) - (ib.grand_total_buku || 0))}</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT - 3 Columns */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            
            {/* COLUMN 1: ASET TETAP + PERSEDIAAN */}
            <div className="space-y-1.5">
              {/* ASET TETAP */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span className="text-[7px] font-bold uppercase">Aset Tetap</span>
                  <span className="ml-auto text-[6px] bg-blue-500 px-1 rounded">{fn(at.total_unit)} unit</span>
                </div>
                <div className="p-1.5">
                  <div className="flex gap-1">
                    <div className="w-16 h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={12} outerRadius={28} dataKey="value" isAnimationActive={true}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 text-[6px] space-y-0.5">
                      {at.breakdown.slice(0, 5).map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="flex items-center gap-0.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor: COLORS[i]}}></span>
                            <span className="truncate">{item.nama}</span>
                          </span>
                          <span className="font-bold ml-1">{fc(item.nilai)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between text-[7px] font-bold">
                    <span>Total</span>
                    <span className="text-blue-700">{fc(at.total_buku)}</span>
                  </div>
                </div>
              </div>

              {/* PERSEDIAAN */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-green-700 text-white px-2 py-0.5 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span className="text-[7px] font-bold uppercase">Persediaan</span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  <MiniStat label="Nilai" value={fc(ib.persediaan?.total_nilai)} color="green" />
                  <MiniStat label="Item" value={fn(ib.persediaan?.total_item)} color="slate" />
                  <MiniStat label="Kritis" value={ib.persediaan?.stok_kritis} color="red" />
                </div>
              </div>

              {/* ASET TAK BERWUJUD */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-purple-700 text-white px-2 py-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span className="text-[7px] font-bold uppercase">Aset Tak Berwujud</span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  <MiniStat label="Perolehan" value={fc(ib.aset_tak_berwujud?.total_nilai)} color="purple" />
                  <MiniStat label="Nilai Buku" value={fc(ib.aset_tak_berwujud?.nilai_buku)} color="purple" />
                  <MiniStat label="Item" value={fn(ib.aset_tak_berwujud?.total_item)} color="slate" />
                </div>
              </div>

              {/* KDP */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-amber-600 text-white px-2 py-0.5 flex items-center gap-1">
                  <Construction className="w-3 h-3" />
                  <span className="text-[7px] font-bold uppercase">KDP</span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  <MiniStat label="Nilai" value={fc(ib.kdp?.total_nilai)} color="amber" />
                  <MiniStat label="Proyek" value={fn(ib.kdp?.proyek_aktif)} color="slate" />
                  <MiniStat label="Progress" value={`${ib.kdp?.progress_rata}%`} color="blue" />
                </div>
              </div>
            </div>

            {/* COLUMN 2: KONDISI + PENGAMANAN + PELABELAN */}
            <div className="space-y-1.5">
              {/* KONDISI ASET */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Kondisi Aset</span>
                </div>
                <div className="p-1.5">
                  <div className="flex gap-1 items-center">
                    <div className="w-14 h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={kondisiData} cx="50%" cy="50%" innerRadius={10} outerRadius={24} dataKey="value" isAnimationActive={true}>
                            {kondisiData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between bg-green-50 rounded px-1 py-0.5">
                        <span className="text-[6px] text-green-700">Baik</span>
                        <span className="text-[7px] font-bold text-green-700">{ka?.baik_persen}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50 rounded px-1 py-0.5">
                        <span className="text-[6px] text-amber-700">Rusak Ringan</span>
                        <span className="text-[7px] font-bold text-amber-700">{ka?.rusak_ringan_persen}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-red-50 rounded px-1 py-0.5">
                        <span className="text-[6px] text-red-700">Rusak Berat</span>
                        <span className="text-[7px] font-bold text-red-700">{ka?.rusak_berat_persen}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PENGAMANAN */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Pengamanan BMN</span>
                </div>
                <div className="p-1.5">
                  <div className="grid grid-cols-3 gap-1 mb-1">
                    <div className="bg-green-500 text-white rounded p-1 text-center">
                      <p className="text-[10px] font-bold">{pg?.administrasi}%</p>
                      <p className="text-[5px]">Admin</p>
                    </div>
                    <div className="bg-blue-500 text-white rounded p-1 text-center">
                      <p className="text-[10px] font-bold">{pg?.fisik}%</p>
                      <p className="text-[5px]">Fisik</p>
                    </div>
                    <div className="bg-purple-500 text-white rounded p-1 text-center">
                      <p className="text-[10px] font-bold">{pg?.hukum}%</p>
                      <p className="text-[5px]">Hukum</p>
                    </div>
                  </div>
                  <div className="text-center bg-slate-100 rounded py-0.5">
                    <span className="text-[7px] font-bold text-slate-700">Rata-rata: {pg?.rata_rata}%</span>
                  </div>
                </div>
              </div>

              {/* PELABELAN */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Status Pelabelan</span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  <div className="bg-green-50 rounded p-1 text-center">
                    <CheckCircle className="w-3 h-3 mx-auto text-green-600" />
                    <p className="text-[8px] font-bold text-green-700">{pl?.terlabel_persen}%</p>
                    <p className="text-[5px] text-slate-500">Terlabel</p>
                  </div>
                  <div className="bg-amber-50 rounded p-1 text-center">
                    <AlertTriangle className="w-3 h-3 mx-auto text-amber-600" />
                    <p className="text-[8px] font-bold text-amber-700">{fn(pl?.belum_label)}</p>
                    <p className="text-[5px] text-slate-500">Belum</p>
                  </div>
                  <div className="bg-red-50 rounded p-1 text-center">
                    <Wrench className="w-3 h-3 mx-auto text-red-600" />
                    <p className="text-[8px] font-bold text-red-700">{fn(pl?.label_rusak)}</p>
                    <p className="text-[5px] text-slate-500">Rusak</p>
                  </div>
                </div>
              </div>

              {/* UTILISASI */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Utilisasi Aset</span>
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-1">
                  <MiniStat label="Digunakan" value="92%" color="green" icon={CheckCircle} />
                  <MiniStat label="Idle" value="5%" color="amber" icon={AlertTriangle} />
                  <MiniStat label="Perbaikan" value="3%" color="red" icon={Wrench} />
                </div>
              </div>
            </div>

            {/* COLUMN 3: DETAIL BREAKDOWN + HIGHLIGHTS */}
            <div className="space-y-1.5">
              {/* BREAKDOWN ASET TETAP */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Rincian Aset Tetap</span>
                </div>
                <div className="p-1">
                  <table className="w-full text-[6px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-1 py-0.5">Kategori</th>
                        <th className="text-right px-1 py-0.5">Nilai</th>
                        <th className="text-right px-1 py-0.5">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {at.breakdown.map((item, i) => (
                        <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                          <td className="px-1 py-0.5 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[i]}}></span>
                            {item.nama}
                          </td>
                          <td className="text-right px-1 py-0.5 font-bold">{fc(item.nilai)}</td>
                          <td className="text-right px-1 py-0.5">{fn(item.unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 font-bold bg-blue-50">
                        <td className="px-1 py-0.5">Total</td>
                        <td className="text-right px-1 py-0.5 text-blue-700">{fc(at.total_buku)}</td>
                        <td className="text-right px-1 py-0.5">{fn(at.total_unit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* MANAJEMEN DOKUMEN */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Kelengkapan Dokumen</span>
                </div>
                <div className="p-1.5 grid grid-cols-2 gap-1">
                  <div className="flex justify-between items-center bg-slate-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">Dok. Perolehan</span>
                    <span className="text-[7px] font-bold text-green-600">95%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">BAST</span>
                    <span className="text-[7px] font-bold text-green-600">92%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">KIB Update</span>
                    <span className="text-[7px] font-bold text-amber-600">88%</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">SK Pengguna</span>
                    <span className="text-[7px] font-bold text-green-600">90%</span>
                  </div>
                </div>
              </div>

              {/* HIGHLIGHT */}
              <div className="border border-blue-200 rounded overflow-hidden bg-blue-50">
                <div className="bg-blue-600 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Highlight & Catatan</span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {(hl || []).slice(0, 5).map((h, i) => (
                    <div key={i} className={`flex items-center gap-1 text-[6px] px-1 py-0.5 rounded ${h.color === 'green' ? 'bg-green-100 text-green-700' : h.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {h.icon === 'up' && <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />}
                      {h.icon === 'check' && <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                      {h.icon === 'alert' && <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />}
                      {h.icon === 'clock' && <Construction className="w-2.5 h-2.5 flex-shrink-0" />}
                      <span className="truncate">{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ASURANSI */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-2 py-0.5">
                  <span className="text-[7px] font-bold uppercase">Asuransi & Sertifikasi</span>
                </div>
                <div className="p-1.5 grid grid-cols-2 gap-1">
                  <div className="flex justify-between items-center bg-green-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">Tanah Sertifikat</span>
                    <span className="text-[7px] font-bold text-green-600">85%</span>
                  </div>
                  <div className="flex justify-between items-center bg-green-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">Gedung IMB</span>
                    <span className="text-[7px] font-bold text-green-600">92%</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">Kendaraan</span>
                    <span className="text-[7px] font-bold text-blue-600">100%</span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-50 rounded px-1 py-0.5">
                    <span className="text-[6px]">Gedung Asuransi</span>
                    <span className="text-[7px] font-bold text-amber-600">78%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW - SUMMARY */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded p-1.5 text-center">
              <p className="text-[6px] uppercase opacity-80">Kondisi Baik</p>
              <p className="text-sm font-bold">{ka?.baik_persen}%</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded p-1.5 text-center">
              <p className="text-[6px] uppercase opacity-80">Pengamanan</p>
              <p className="text-sm font-bold">{pg?.rata_rata}%</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded p-1.5 text-center">
              <p className="text-[6px] uppercase opacity-80">Pelabelan</p>
              <p className="text-sm font-bold">{pl?.terlabel_persen}%</p>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded p-1.5 text-center">
              <p className="text-[6px] uppercase opacity-80">Dok. Lengkap</p>
              <p className="text-sm font-bold">91%</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-3 py-1 border-t border-slate-200 flex justify-between text-[6px] text-slate-400 mt-auto">
          <span>LAPORAN RINGKAS BMN - Dibuat otomatis oleh SIMAN-G</span>
          <span>{header?.tanggal}</span>
        </footer>
      </div>

      <style>{`
        /* Screen styles for preview - A4 dimensions */
        @media screen {
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            max-width: 210mm;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          }
        }
        
        @media print {
          *, *::before, *::after { box-sizing: border-box !important; }
          html, body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            margin: 0 !important; padding: 0 !important;
            background: white !important;
          }
          .no-print, nav, aside, [class*="sidebar"], [class*="Sidebar"], [class*="sticky"], [class*="fixed"], .print-container > div:first-child { 
            display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important;
          }
          .min-h-screen, .bg-slate-200, .bg-slate-50, .print-container, [class*="md:ml-"] {
            all: unset !important; display: block !important; margin: 0 !important; padding: 0 !important; background: white !important;
          }
          .a4-page { 
            width: 210mm !important; height: 297mm !important; min-height: 297mm !important; max-width: 210mm !important;
            margin: 0 auto !important; padding: 0 !important; box-shadow: none !important;
            overflow: hidden !important; position: relative !important; background: white !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}
