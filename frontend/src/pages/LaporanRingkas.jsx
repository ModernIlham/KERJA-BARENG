/**
 * Laporan Ringkas BMN - Executive Summary 1 Halaman A4
 * Merangkum seluruh Laporan Inti dalam 1 lembar
 */

import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Building2, Package, Wrench, MapPin, Construction, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const fc = (v) => {
  if (!v || v === 0) return 'Rp 0';
  if (v >= 1e12) return `Rp ${(v/1e12).toFixed(2)}T`;
  if (v >= 1e9) return `Rp ${(v/1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v/1e6).toFixed(0)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const fn = (v) => v ? v.toLocaleString('id-ID') : '0';

const COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#16a34a', '#ca8a04'];

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

  const { header, ikhtisar_bmn: ib, kondisi_aset: ka, pengamanan: pg, pelabelan: pl, highlight: hl, tanda_tangan: tt } = data;
  const at = ib.aset_tetap;

  // Prepare pie chart data
  const pieData = at.breakdown.map((item, i) => ({
    name: item.nama,
    value: item.nilai,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="print-container bg-slate-200 min-h-screen py-6 print:bg-white print:py-0 print:min-h-0">
      {/* Action Bar - Hidden during print */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center shadow-sm mb-4">
        <h1 className="text-sm font-bold text-slate-800">📋 Laporan Ringkas BMN</h1>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-3 w-3" />Cetak</Button>
      </div>

      {/* Single A4 Page */}
      <div ref={reportRef} className="a4-page bg-white mx-auto shadow-xl print:shadow-none relative" style={{ width: '210mm', minHeight: '297mm', maxWidth: '210mm' }}>
        
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/30">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-slate-300 uppercase tracking-wider">{header?.kementerian}</p>
              <h1 className="text-[11px] font-bold">{header?.direktorat}</h1>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-400">{header?.nomor_dokumen}</p>
              <span className="text-[9px] font-bold bg-blue-600 px-2 py-0.5 rounded inline-block mt-0.5">TA {header?.tahun_anggaran}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/20 text-center">
            <h2 className="text-base font-bold uppercase tracking-wide">RINGKASAN EKSEKUTIF LAPORAN BMN</h2>
            <p className="text-[9px] text-slate-300 mt-0.5">One-Page Executive Summary • {header?.tanggal}</p>
          </div>
        </header>

        {/* Content */}
        <main className="px-6 py-4">
          
          {/* GRAND TOTAL */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center border-r border-white/20">
                <p className="text-[10px] text-blue-200 uppercase">Total Nilai Perolehan</p>
                <p className="text-2xl font-bold">{fc(ib.grand_total_perolehan)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-blue-200 uppercase">Total Nilai Buku</p>
                <p className="text-2xl font-bold">{fc(ib.grand_total_buku)}</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT - 2 Columns */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            
            {/* LEFT COLUMN */}
            <div className="space-y-3">
              
              {/* ASET TETAP */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Aset Tetap
                  </h3>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value" isAnimationActive={true}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 text-[8px] space-y-1">
                      {at.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}}></span>
                            {item.nama}
                          </span>
                          <span className="font-bold">{fc(item.nilai)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[9px] font-bold">
                    <span>Total Aset Tetap</span>
                    <span className="text-blue-700">{fc(at.total_buku)} ({fn(at.total_unit)} unit)</span>
                  </div>
                </div>
              </div>

              {/* PERSEDIAAN */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-green-600" /> Aset Lancar - Persediaan
                  </h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2 text-center text-[8px]">
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-green-700 font-bold text-sm">{fc(ib.persediaan?.total_nilai)}</p>
                    <p className="text-slate-500">Total Nilai</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-700 font-bold text-sm">{fn(ib.persediaan?.total_item)}</p>
                    <p className="text-slate-500">Total Item</p>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <p className="text-amber-700 font-bold text-sm">{ib.persediaan?.stok_kritis}</p>
                    <p className="text-slate-500">Stok Kritis</p>
                  </div>
                </div>
              </div>

              {/* ASET TAK BERWUJUD */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Aset Tak Berwujud
                  </h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2 text-center text-[8px]">
                  <div className="bg-purple-50 rounded p-2">
                    <p className="text-purple-700 font-bold text-sm">{fc(ib.aset_tak_berwujud?.total_nilai)}</p>
                    <p className="text-slate-500">Perolehan</p>
                  </div>
                  <div className="bg-purple-50 rounded p-2">
                    <p className="text-purple-700 font-bold text-sm">{fc(ib.aset_tak_berwujud?.nilai_buku)}</p>
                    <p className="text-slate-500">Nilai Buku</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-700 font-bold text-sm">{fn(ib.aset_tak_berwujud?.total_item)}</p>
                    <p className="text-slate-500">Item</p>
                  </div>
                </div>
              </div>

              {/* KDP */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Construction className="w-3.5 h-3.5 text-amber-600" /> Konstruksi Dalam Pengerjaan
                  </h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2 text-center text-[8px]">
                  <div className="bg-amber-50 rounded p-2">
                    <p className="text-amber-700 font-bold text-sm">{fc(ib.kdp?.total_nilai)}</p>
                    <p className="text-slate-500">Total Nilai</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-700 font-bold text-sm">{fn(ib.kdp?.proyek_aktif)}</p>
                    <p className="text-slate-500">Proyek</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-blue-700 font-bold text-sm">{ib.kdp?.progress_rata}%</p>
                    <p className="text-slate-500">Rata-rata Progress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3">
              
              {/* KONDISI ASET */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase">Kondisi Aset</h3>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] text-slate-600">Baik</span>
                        <span className="text-[8px] font-bold text-green-600">{ka?.baik_persen}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-green-500 h-full rounded-full" style={{width: `${ka?.baik_persen}%`}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[8px]">
                    <div className="flex items-center justify-between bg-amber-50 rounded p-1.5">
                      <span className="text-amber-700">Rusak Ringan</span>
                      <span className="font-bold text-amber-700">{ka?.rusak_ringan_persen}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-red-50 rounded p-1.5">
                      <span className="text-red-700">Rusak Berat</span>
                      <span className="font-bold text-red-700">{ka?.rusak_berat_persen}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PENGAMANAN */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase">Pengamanan Aset BMN</h3>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-green-500 text-white rounded p-2">
                      <p className="text-lg font-bold">{pg?.administrasi}%</p>
                      <p className="text-[7px]">Administrasi</p>
                    </div>
                    <div className="bg-blue-500 text-white rounded p-2">
                      <p className="text-lg font-bold">{pg?.fisik}%</p>
                      <p className="text-[7px]">Fisik</p>
                    </div>
                    <div className="bg-purple-500 text-white rounded p-2">
                      <p className="text-lg font-bold">{pg?.hukum}%</p>
                      <p className="text-[7px]">Hukum</p>
                    </div>
                  </div>
                  <div className="text-center bg-slate-100 rounded p-1.5">
                    <span className="text-[9px] font-bold text-slate-700">Rata-rata Pengamanan: {pg?.rata_rata}%</span>
                  </div>
                </div>
              </div>

              {/* PELABELAN */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-700 uppercase">Status Pelabelan</h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2 text-center text-[8px]">
                  <div className="bg-green-50 rounded p-2">
                    <CheckCircle className="w-4 h-4 mx-auto text-green-600 mb-1" />
                    <p className="text-green-700 font-bold">{pl?.terlabel_persen}%</p>
                    <p className="text-slate-500">Terlabel</p>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <AlertTriangle className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                    <p className="text-amber-700 font-bold">{fn(pl?.belum_label)}</p>
                    <p className="text-slate-500">Belum Label</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <Wrench className="w-4 h-4 mx-auto text-red-600 mb-1" />
                    <p className="text-red-700 font-bold">{fn(pl?.label_rusak)}</p>
                    <p className="text-slate-500">Label Rusak</p>
                  </div>
                </div>
              </div>

              {/* HIGHLIGHT */}
              <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
                <div className="bg-blue-100 px-3 py-1.5 border-b border-blue-200">
                  <h3 className="text-[10px] font-bold text-blue-800 uppercase">Highlight & Catatan</h3>
                </div>
                <div className="p-3 space-y-1.5">
                  {(hl || []).map((h, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[8px] p-1.5 rounded ${h.color === 'green' ? 'bg-green-100 text-green-700' : h.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {h.icon === 'up' && <TrendingUp className="w-3 h-3" />}
                      {h.icon === 'check' && <CheckCircle className="w-3 h-3" />}
                      {h.icon === 'alert' && <AlertTriangle className="w-3 h-3" />}
                      {h.icon === 'clock' && <Construction className="w-3 h-3" />}
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SIGNATURE */}
          <div className="border-t-2 border-slate-300 pt-4 mt-2">
            <div className="grid grid-cols-3 gap-4">
              <div></div>
              <div className="text-center">
                <p className="text-[9px] text-slate-500 mb-8">Mengetahui,</p>
                <p className="text-[9px] font-semibold text-slate-600">{tt?.jabatan}</p>
                <div className="border-b border-slate-300 mx-8 my-6"></div>
                <p className="text-[10px] font-bold text-slate-900">{tt?.nama}</p>
                <p className="text-[8px] text-slate-500 font-mono">NIP. {tt?.nip}</p>
              </div>
              <div></div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 px-4 py-1.5 border-t border-slate-200 flex justify-between text-[7px] text-slate-400">
          <span>LAPORAN RINGKAS BMN - Executive Summary</span>
          <span>{header?.tanggal}</span>
        </footer>
      </div>

      <style>{`
        @media print {
          /* Reset everything */
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          
          /* Body reset for print */
          html, body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            margin: 0 !important; 
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: visible !important;
            background: white !important;
          }
          
          /* Hide ALL UI elements except content */
          .no-print,
          nav,
          aside,
          [class*="sidebar"],
          [class*="Sidebar"],
          [class*="sticky"],
          [class*="fixed"] { 
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Reset all containers */
          .min-h-screen,
          .bg-slate-200,
          .bg-slate-50,
          .print-container,
          [class*="md:ml-"] {
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            margin-left: 0 !important;
            background: transparent !important;
            width: 100% !important;
          }
          
          /* A4 Page - exact sizing */
          .a4-page { 
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            position: relative !important;
          }
          
          /* Page setup */
          @page { 
            size: 210mm 297mm;
            margin: 0;
          }
        }
        
        /* Screen styles for preview */
        @media screen {
          .a4-page {
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          }
        }
      `}</style>
    </div>
  );
}
