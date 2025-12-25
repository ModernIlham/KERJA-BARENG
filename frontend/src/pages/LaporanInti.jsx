/**
 * Laporan Inti BMN - Complete Government Asset Report
 * All categories: Aset Tetap, Persediaan, Aset Tak Berwujud, KDP
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, Shield, FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Package, Warehouse, Building2, Car, MapPin, Wrench, BookOpen, Construction } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Compact formatters
const fc = (v) => {
  if (!v || v === 0) return 'Rp 0';
  if (v >= 1e12) return `Rp ${(v/1e12).toFixed(2)}T`;
  if (v >= 1e9) return `Rp ${(v/1e9).toFixed(2)}M`;
  if (v >= 1e6) return `Rp ${(v/1e6).toFixed(1)}Jt`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

const fn = (v) => v ? v.toLocaleString('id-ID') : '0';

const COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed', '#db2777'];
const C = { primary: '#1e3a5f', success: '#16a34a', warning: '#ca8a04', danger: '#dc2626', info: '#0891b2' };

// ==================== COMPONENTS ====================
const A4Page = ({ children, pageNum, totalPages, header }) => (
  <div className="a4-page bg-white w-[210mm] min-h-[297mm] mx-auto mb-6 shadow-xl print:shadow-none print:mb-0 print:break-after-page relative flex flex-col">
    <header className="bg-slate-900 text-white px-5 py-3 flex items-center gap-3">
      <Shield className="w-8 h-8 opacity-80" />
      <div className="flex-1">
        <p className="text-[9px] text-slate-300 uppercase tracking-wider">{header?.kementerian}</p>
        <h1 className="text-xs font-bold">{header?.direktorat}</h1>
      </div>
      <div className="text-right">
        <p className="text-[8px] text-slate-400">{header?.nomor_dokumen}</p>
        <span className="text-[9px] font-bold bg-blue-700 px-2 py-0.5 rounded">TA {header?.tahun_anggaran}</span>
      </div>
    </header>
    <main className="flex-1 px-5 py-3 overflow-hidden text-[9px]">{children}</main>
    <footer className="px-5 py-1.5 border-t border-slate-200 flex justify-between text-[8px] text-slate-400">
      <span>LAPORAN BMN - {new Date().toLocaleDateString('id-ID')}</span>
      <span className="font-medium">Halaman {pageNum} dari {totalPages}</span>
    </footer>
  </div>
);

const Section = ({ num, title, children }) => (
  <div className="mb-3">
    <div className="flex items-center gap-1.5 mb-2 pb-1 border-b-2 border-slate-700">
      <span className="bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{num}</span>
      <h2 className="text-[10px] font-bold text-slate-900 uppercase">{title}</h2>
    </div>
    {children}
  </div>
);

const MiniCard = ({ title, items, className = '' }) => (
  <div className={`border border-slate-200 rounded text-[8px] ${className}`}>
    <div className="bg-slate-100 px-2 border-b border-slate-200" style={{ padding: '6px 8px' }}>
      <h3 className="font-bold text-slate-700 uppercase text-[7px]" style={{ lineHeight: '1.2', margin: 0 }}>{title}</h3>
    </div>
    <div className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <div key={i} className={`flex justify-between items-center ${item.highlight ? 'bg-blue-50' : ''}`} style={{ padding: '5px 8px' }}>
          <span className="text-slate-600" style={{ lineHeight: '1.3' }}>{item.label}</span>
          <span className={`font-bold ${item.highlight ? 'text-blue-700' : item.danger ? 'text-red-600' : 'text-slate-800'}`} style={{ lineHeight: '1.3' }}>{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const MiniTable = ({ columns, data, title }) => (
  <div className="border border-slate-200 rounded overflow-hidden text-[8px]">
    {title && <div className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[7px]" style={{ padding: '6px 8px', lineHeight: '1.2' }}>{title}</div>}
    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {columns.map((col, i) => (
            <th key={i} className={`text-[7px] font-bold text-slate-600 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} style={{ padding: '6px 6px', lineHeight: '1.2', verticalAlign: 'middle' }}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
            {columns.map((col, j) => (
              <td key={j} className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.bold ? 'font-bold' : ''}`} style={{ padding: '5px 6px', lineHeight: '1.3', verticalAlign: 'middle' }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StatBox = ({ value, label, sub, color = 'slate' }) => {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700'
  };
  return (
    <div className={`text-center rounded border ${colors[color]}`} style={{ padding: '8px' }}>
      <p className="text-sm font-bold" style={{ lineHeight: '1.2', margin: 0 }}>{value}</p>
      <p className="text-[7px] text-slate-500" style={{ lineHeight: '1.2', marginTop: '3px', marginBottom: 0 }}>{label}</p>
      {sub && <p className="text-[6px] text-slate-400" style={{ lineHeight: '1.2', marginTop: '2px', marginBottom: 0 }}>{sub}</p>}
    </div>
  );
};

// Chart Legend Component
const ChartLegend = ({ items }) => (
  <div className="flex flex-wrap justify-center gap-2 mt-1 text-[7px]" style={{ marginTop: '4px' }}>
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1" style={{ lineHeight: '1.2' }}>
        <span className="rounded-sm" style={{ width: '10px', height: '10px', backgroundColor: item.color, flexShrink: 0 }}></span>
        <span className="text-slate-600">{item.label}</span>
      </span>
    ))}
  </div>
);

// ==================== MAIN COMPONENT ====================
export default function LaporanInti() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    api.get('/api/laporan-inti/full-report')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    setPdfMode(true);
    
    // Wait for charts to re-render without animations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const element = reportRef.current;
      const filename = `Laporan_BMN_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`;
      
      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get all A4 pages
      const pages = element.querySelectorAll('.a4-page');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Capture each page with high quality
        const canvas = await html2canvas(page, {
          scale: 2.5, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: page.scrollWidth,
          height: page.scrollHeight,
          onclone: (clonedDoc) => {
            // Force visibility of all elements in cloned document
            const clonedPage = clonedDoc.querySelector('.a4-page');
            if (clonedPage) {
              clonedPage.style.overflow = 'visible';
              clonedPage.style.height = 'auto';
            }
          }
        });
        
        // Calculate dimensions to fit A4
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = a4Width;
        const imgHeight = (canvas.height * a4Width) / canvas.width;
        
        // Add page (except for first page which is already created)
        if (i > 0) {
          pdf.addPage();
        }
        
        // Add image to PDF, centered and scaled to fit
        const yOffset = imgHeight > a4Height ? 0 : (a4Height - imgHeight) / 2;
        pdf.addImage(imgData, 'JPEG', 0, Math.max(0, yOffset), imgWidth, Math.min(imgHeight, a4Height));
      }
      
      // Save PDF
      pdf.save(filename);
      
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setPdfMode(false);
      setDownloading(false);
    }
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>;
  if (!data) return <div className="flex justify-center items-center min-h-screen text-red-500">Gagal memuat data</div>;

  const { ringkasan_eksekutif: re, rekapitulasi_kategori: rk, kondisi_aset: ka, pelabelan_aset: pa, pengamanan_aset: pn, persediaan: ps, dasar_hukum: dh, header } = data;
  const at = re.aset_tetap;
  const totalPages = 4;
  
  // Animation duration - disable during PDF generation
  const animDuration = pdfMode ? 0 : 400;

  return (
    <div className="bg-slate-200 min-h-screen py-6 print:bg-white print:py-0">
      {/* Action Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2 flex justify-between items-center no-print shadow-sm mb-4">
        <h1 className="text-sm font-bold text-slate-800">📊 Laporan Inti BMN</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-3 w-3" />Cetak</Button>
          <Button size="sm" className="bg-blue-700 text-white" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Proses...</> : <><Download className="mr-1 h-3 w-3" />PDF</>}
          </Button>
        </div>
      </div>

      <div ref={reportRef}>
        {/* ==================== PAGE 1 ==================== */}
        <A4Page pageNum={1} totalPages={totalPages} header={header}>
          <div className="text-center mb-3 pb-2 border-b-2 border-slate-300">
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">LAPORAN BARANG MILIK NEGARA (BMN)</h1>
            <p className="text-[8px] text-slate-500">Sesuai PP No. 27 Tahun 2014</p>
          </div>

          {/* SECTION I: ASET TETAP */}
          <Section num="I" title="Ringkasan Eksekutif - Aset Tetap">
            <div className="grid grid-cols-5 gap-2 mb-2">
              <MiniCard title="Tanah (1.3.1)" items={[
                { label: 'Perolehan', value: fc(at.tanah?.nilai_perolehan) },
                { label: 'Penyusutan', value: fc(at.tanah?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(at.tanah?.nilai_buku), highlight: true },
                { label: 'Unit/Bidang', value: fn(at.tanah?.unit) }
              ]} />
              <MiniCard title="Peralatan & Mesin (1.3.2)" items={[
                { label: 'Perolehan', value: fc(at.peralatan_mesin?.nilai_perolehan) },
                { label: 'Penyusutan', value: fc(at.peralatan_mesin?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(at.peralatan_mesin?.nilai_buku), highlight: true },
                { label: 'Unit', value: fn(at.peralatan_mesin?.unit) }
              ]} />
              <MiniCard title="Gedung & Bangunan (1.3.3)" items={[
                { label: 'Perolehan', value: fc(at.gedung_bangunan?.nilai_perolehan) },
                { label: 'Penyusutan', value: fc(at.gedung_bangunan?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(at.gedung_bangunan?.nilai_buku), highlight: true },
                { label: 'Unit', value: fn(at.gedung_bangunan?.unit) }
              ]} />
              <MiniCard title="Jalan, Irigasi, Jaringan (1.3.4)" items={[
                { label: 'Perolehan', value: fc(at.jalan_irigasi?.nilai_perolehan) },
                { label: 'Penyusutan', value: fc(at.jalan_irigasi?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(at.jalan_irigasi?.nilai_buku), highlight: true },
                { label: 'Unit', value: fn(at.jalan_irigasi?.unit) }
              ]} />
              <MiniCard title="Aset Tetap Lainnya (1.3.5)" items={[
                { label: 'Perolehan', value: fc(at.aset_tetap_lainnya?.nilai_perolehan) },
                { label: 'Penyusutan', value: fc(at.aset_tetap_lainnya?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(at.aset_tetap_lainnya?.nilai_buku), highlight: true },
                { label: 'Unit', value: fn(at.aset_tetap_lainnya?.unit) }
              ]} />
            </div>
            <div className="bg-slate-100 rounded px-3 py-1.5 flex justify-between items-center text-[9px] font-bold mb-3">
              <span>TOTAL ASET TETAP</span>
              <span className="text-blue-700">Nilai Buku: {fc(at.total?.nilai_buku)} ({fn(at.total?.unit)} unit)</span>
            </div>
          </Section>

          {/* SECTION II: PERSEDIAAN, ATB, KDP */}
          <Section num="II" title="Aset Lancar, Tak Berwujud & KDP">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <MiniCard title="Persediaan (1.1.5)" items={[
                { label: 'Total Nilai', value: fc(re.persediaan?.total_nilai), highlight: true },
                { label: 'Total Item', value: fn(re.persediaan?.total_item) },
                { label: 'Saldo Awal', value: fc(re.persediaan?.mutasi?.saldo_awal) },
                { label: 'Masuk', value: fc(re.persediaan?.mutasi?.masuk) },
                { label: 'Keluar', value: fc(re.persediaan?.mutasi?.keluar), danger: true }
              ]} />
              <MiniCard title="Aset Tak Berwujud (1.5.3)" items={[
                { label: 'Total Nilai', value: fc(re.aset_tak_berwujud?.total_nilai) },
                { label: 'Amortisasi', value: fc(re.aset_tak_berwujud?.nilai_penyusutan) },
                { label: 'Nilai Buku', value: fc(re.aset_tak_berwujud?.nilai_buku), highlight: true },
                { label: 'Total Item', value: fn(re.aset_tak_berwujud?.total_item) }
              ]} />
              <MiniCard title="KDP (1.3.6)" items={[
                { label: 'Total Nilai', value: fc(re.kdp?.total_nilai), highlight: true },
                { label: 'Proyek Aktif', value: fn(re.kdp?.total_proyek) },
                { label: 'On Track', value: `${re.kdp?.status_proyek?.on_track || 0} proyek` },
                { label: 'Realisasi', value: `${re.kdp?.realisasi_anggaran?.persentase || 0}%` }
              ]} />
            </div>
            <div className="bg-blue-100 rounded px-3 py-1.5 text-center text-[9px] font-bold text-blue-800 mb-3">
              GRAND TOTAL BMN: Perolehan {fc(re.grand_total?.nilai_perolehan)} | Nilai Buku {fc(re.grand_total?.nilai_buku)}
            </div>
          </Section>

          {/* SECTION III: REKAPITULASI */}
          <Section num="III" title="Rekapitulasi per Kategori">
            <MiniTable 
              columns={[
                { key: 'kode', header: 'Kode', align: 'center' },
                { key: 'kategori', header: 'Kategori' },
                { key: 'unit', header: 'Unit', align: 'center' },
                { key: 'perolehan', header: 'Perolehan', align: 'right', render: v => fc(v) },
                { key: 'penyusutan', header: 'Penyusutan', align: 'right', render: v => fc(v) },
                { key: 'nilai_buku', header: 'Nilai Buku', align: 'right', render: v => fc(v), bold: true },
                { key: 'persentase', header: '%', align: 'center', render: v => `${v}%` }
              ]}
              data={rk?.data || []}
            />
            <div className="mt-1 bg-slate-100 rounded px-2 py-1 flex justify-between text-[8px] font-bold">
              <span>TOTAL</span>
              <span>Perolehan: {fc(rk?.total?.perolehan)} | Nilai Buku: {fc(rk?.total?.nilai_buku)} ({fn(rk?.total?.unit)} unit)</span>
            </div>
          </Section>

          {/* SECTION IV: KONDISI ASET */}
          <Section num="IV" title="Kondisi Aset">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-600 uppercase mb-1">Distribusi Kondisi</h4>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ka?.distribusi || []} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="count" nameKey="label" isAnimationActive={!pdfMode}>
                        {(ka?.distribusi || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => `${v} unit`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={(ka?.distribusi || []).map(d => ({ label: `${d.label} (${d.persentase}%)`, color: d.color }))} />
              </div>
              <MiniTable 
                title="Kondisi per Kategori"
                columns={[
                  { key: 'kategori', header: 'Kategori' },
                  { key: 'baik', header: 'Baik', align: 'center' },
                  { key: 'rr', header: 'RR', align: 'center' },
                  { key: 'rb', header: 'RB', align: 'center' },
                  { key: 'total', header: 'Total', align: 'center', bold: true }
                ]}
                data={ka?.per_kategori || []}
              />
            </div>
          </Section>
        </A4Page>

        {/* ==================== PAGE 2 ==================== */}
        <A4Page pageNum={2} totalPages={totalPages} header={header}>
          {/* SECTION V: DETAIL ASET */}
          <Section num="V" title="Detail Aset per Sub-Kategori">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <MiniTable 
                title="Sub-Kategori Peralatan & Mesin"
                columns={[
                  { key: 'nama', header: 'Sub-Kategori' },
                  { key: 'unit', header: 'Unit', align: 'center' },
                  { key: 'nilai', header: 'Nilai', align: 'right', render: v => fc(v) }
                ]}
                data={at.peralatan_mesin?.sub_kategori?.slice(0, 6) || []}
              />
              <MiniTable 
                title="Sub-Kategori Gedung & Bangunan"
                columns={[
                  { key: 'nama', header: 'Sub-Kategori' },
                  { key: 'unit', header: 'Unit', align: 'center' },
                  { key: 'nilai', header: 'Nilai', align: 'right', render: v => fc(v) }
                ]}
                data={at.gedung_bangunan?.sub_kategori?.slice(0, 6) || []}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniTable 
                title="Lokasi Tanah"
                columns={[
                  { key: 'nama', header: 'Lokasi' },
                  { key: 'luas', header: 'Luas (m²)', align: 'right', render: v => fn(v) },
                  { key: 'nilai', header: 'Nilai', align: 'right', render: v => fc(v) }
                ]}
                data={at.tanah?.lokasi?.slice(0, 4) || []}
              />
              <MiniTable 
                title="Aset Tak Berwujud - Detail"
                columns={[
                  { key: 'nama', header: 'Kategori' },
                  { key: 'unit', header: 'Unit', align: 'center' },
                  { key: 'nilai_buku', header: 'Nilai Buku', align: 'right', render: v => fc(v) }
                ]}
                data={re.aset_tak_berwujud?.kategori?.slice(0, 5) || []}
              />
            </div>
          </Section>

          {/* SECTION VI: KDP */}
          <Section num="VI" title="Konstruksi Dalam Pengerjaan (KDP)">
            <MiniTable 
              title="Daftar Proyek Aktif"
              columns={[
                { key: 'nama', header: 'Nama Proyek' },
                { key: 'lokasi', header: 'Lokasi' },
                { key: 'nilai_kontrak', header: 'Nilai Kontrak', align: 'right', render: v => fc(v) },
                { key: 'realisasi', header: 'Realisasi', align: 'right', render: v => fc(v) },
                { key: 'progress', header: 'Progress', align: 'center', render: v => `${v}%` },
                { key: 'target', header: 'Target' }
              ]}
              data={re.kdp?.proyek_aktif?.slice(0, 5) || []}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <StatBox value={re.kdp?.status_proyek?.on_track || 0} label="On Track" color="green" />
              <StatBox value={re.kdp?.status_proyek?.delayed || 0} label="Delayed" color="amber" />
              <StatBox value={`${re.kdp?.realisasi_anggaran?.persentase || 0}%`} label="Realisasi Anggaran" color="blue" />
            </div>
          </Section>

          {/* SECTION VII: PELABELAN */}
          <Section num="VII" title="Manajemen Pelabelan Aset">
            <div className="grid grid-cols-4 gap-2 mb-2">
              <StatBox value={`${pa?.status_label?.persentase_terlabel || 0}%`} label="Terlabel" sub={`${fn(pa?.status_label?.terlabel)} unit`} color="green" />
              <StatBox value={`${(100 - (pa?.status_label?.persentase_terlabel || 0)).toFixed(1)}%`} label="Belum Label" sub={`${fn(pa?.status_label?.belum)} unit`} color="amber" />
              <StatBox value={`${pa?.status_cetak?.persentase_tercetak || 0}%`} label="Tercetak" sub={`${fn(pa?.status_cetak?.tercetak)} unit`} color="blue" />
              <StatBox value={fn(pa?.total_rusak)} label="Label Rusak" sub="Perlu ganti" color="red" />
            </div>
            <MiniTable 
              title="Detail per Kategori"
              columns={[
                { key: 'kategori', header: 'Kategori' },
                { key: 'total', header: 'Total', align: 'center' },
                { key: 'label', header: 'Terlabel', align: 'center' },
                { key: 'belum', header: 'Belum', align: 'center' },
                { key: 'persentase', header: '%', align: 'center', render: v => `${v}%` }
              ]}
              data={pa?.detail_per_kategori || []}
            />
          </Section>

          {/* SECTION VIII: PENGAMANAN */}
          <Section num="VIII" title="Pengamanan Aset BMN">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded p-2 text-center">
                <p className="text-lg font-bold">{pn?.tertib?.administrasi?.persentase || 0}%</p>
                <p className="text-[8px] text-green-100">Tertib Administrasi</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded p-2 text-center">
                <p className="text-lg font-bold">{pn?.tertib?.fisik?.persentase || 0}%</p>
                <p className="text-[8px] text-blue-100">Tertib Fisik</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded p-2 text-center">
                <p className="text-lg font-bold">{pn?.tertib?.hukum?.persentase || 0}%</p>
                <p className="text-[8px] text-purple-100">Tertib Hukum</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-600 uppercase mb-1">Tren Pengamanan</h4>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pn?.tren_pengamanan || []}>
                      <XAxis dataKey="bulan" tick={{fontSize: 7}} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 7}} />
                      <Tooltip />
                      <Line type="monotone" dataKey="admin" stroke={C.success} strokeWidth={1.5} dot={{r: 1}} isAnimationActive={!pdfMode} />
                      <Line type="monotone" dataKey="fisik" stroke={C.info} strokeWidth={1.5} dot={{r: 1}} isAnimationActive={!pdfMode} />
                      <Line type="monotone" dataKey="hukum" stroke="#7c3aed" strokeWidth={1.5} dot={{r: 1}} isAnimationActive={!pdfMode} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[
                  { label: 'Administrasi', color: C.success },
                  { label: 'Fisik', color: C.info },
                  { label: 'Hukum', color: '#7c3aed' }
                ]} />
              </div>
              <MiniTable 
                title="Status per Unit Kerja"
                columns={[
                  { key: 'unit', header: 'Unit' },
                  { key: 'admin', header: 'Adm', align: 'center', render: v => `${v}%` },
                  { key: 'fisik', header: 'Fisik', align: 'center', render: v => `${v}%` },
                  { key: 'hukum', header: 'Hukum', align: 'center', render: v => `${v}%` },
                  { key: 'overall', header: 'Total', align: 'center', render: v => `${v}%`, bold: true }
                ]}
                data={pn?.per_unit_kerja?.slice(0, 4) || []}
              />
            </div>
          </Section>
        </A4Page>

        {/* ==================== PAGE 3 ==================== */}
        <A4Page pageNum={3} totalPages={totalPages} header={header}>
          {/* SECTION IX: PERSEDIAAN */}
          <Section num="IX" title="Aset Lancar - Persediaan">
            <div className="grid grid-cols-4 gap-2 mb-2">
              <StatBox value={fc(ps?.nilai_persediaan?.total_nilai)} label="Total Nilai" color="blue" />
              <StatBox value={fn(ps?.nilai_persediaan?.total_item)} label="Total Item" color="slate" />
              <StatBox value={fc(ps?.mutasi?.masuk)} label="Masuk" color="green" />
              <StatBox value={fc(ps?.mutasi?.keluar)} label="Keluar" color="red" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-600 uppercase mb-1">Distribusi per Kategori</h4>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ps?.distribusi_kategori || []} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="nilai" nameKey="nama" isAnimationActive={!pdfMode}>
                        {(ps?.distribusi_kategori || []).map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fc(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={(ps?.distribusi_kategori || []).map((d, i) => ({ label: d.nama, color: COLORS[i % COLORS.length] }))} />
              </div>
              <div className="border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-600 uppercase mb-1">Tren Mutasi</h4>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ps?.tren_mutasi || []}>
                      <XAxis dataKey="bulan" tick={{fontSize: 7}} />
                      <YAxis tickFormatter={v => `${(v/1e9).toFixed(0)}M`} tick={{fontSize: 7}} />
                      <Tooltip formatter={v => fc(v)} />
                      <Line type="monotone" dataKey="masuk" stroke={C.success} strokeWidth={1.5} isAnimationActive={!pdfMode} />
                      <Line type="monotone" dataKey="keluar" stroke={C.danger} strokeWidth={1.5} isAnimationActive={!pdfMode} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={[
                  { label: 'Barang Masuk', color: C.success },
                  { label: 'Barang Keluar', color: C.danger }
                ]} />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded mb-2" style={{ padding: '8px' }}>
              <h4 className="text-[7px] font-bold text-amber-800 uppercase flex items-center gap-1" style={{ marginBottom: '6px', lineHeight: '1.2' }}>
                <AlertTriangle className="w-3 h-3" /> Stok Kritis
              </h4>
              <div className="grid grid-cols-5 gap-1.5 text-[7px]">
                {(ps?.stok_rendah || []).map((s, i) => (
                  <div key={i} className={`rounded ${s.status === 'Kritis' ? 'bg-red-100 border border-red-200' : 'bg-amber-100 border border-amber-200'}`} style={{ padding: '6px' }}>
                    <p className="font-bold truncate" style={{ lineHeight: '1.3', margin: 0 }}>{s.nama}</p>
                    <p className="text-[6px]" style={{ lineHeight: '1.3', marginTop: '3px', marginBottom: 0 }}>Stok: {s.stok}/{s.min} {s.unit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniTable 
                title="Kapasitas Gudang"
                columns={[
                  { key: 'gudang', header: 'Gudang' },
                  { key: 'pic', header: 'PIC' },
                  { key: 'item', header: 'Item', align: 'center' },
                  { key: 'nilai', header: 'Nilai', align: 'right', render: v => fc(v) },
                  { key: 'kapasitas', header: '%', align: 'center', render: v => `${v}%` }
                ]}
                data={ps?.gudang || []}
              />
              <MiniTable 
                title="Permintaan per Unit"
                columns={[
                  { key: 'unit', header: 'Unit' },
                  { key: 'total', header: 'Total', align: 'center' },
                  { key: 'nilai', header: 'Nilai', align: 'right', render: v => fc(v) },
                  { key: 'persentase', header: '%', align: 'center', render: v => `${v}%` }
                ]}
                data={ps?.permintaan_unit || []}
              />
            </div>
          </Section>

          {/* SECTION X: MANAJEMEN ASET KOMPREHENSIF */}
          <Section num="X" title="Manajemen Aset Komprehensif">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Manajemen Dokumen */}
              <MiniCard title="Kelengkapan Dokumen" items={[
                { label: 'Dokumen Perolehan', value: '95%', highlight: true },
                { label: 'BAST Lengkap', value: '92%' },
                { label: 'KIB Terupdate', value: '88%' },
                { label: 'SK Pengguna', value: '90%' }
              ]} />
              {/* Pemeliharaan */}
              <MiniCard title="Status Pemeliharaan" items={[
                { label: 'Terjadwal', value: fn(Math.round((at.total?.unit || 0) * 0.85)) },
                { label: 'Belum Terjadwal', value: fn(Math.round((at.total?.unit || 0) * 0.15)), danger: true },
                { label: 'Realisasi Pemeliharaan', value: '78%' },
                { label: 'Anggaran Terpakai', value: '65%' }
              ]} />
              {/* Utilisasi */}
              <MiniCard title="Utilisasi Aset" items={[
                { label: 'Digunakan', value: `${fn(Math.round((at.total?.unit || 0) * 0.92))} unit`, highlight: true },
                { label: 'Idle/Tidak Digunakan', value: `${fn(Math.round((at.total?.unit || 0) * 0.05))} unit`, danger: true },
                { label: 'Dalam Perbaikan', value: `${fn(Math.round((at.total?.unit || 0) * 0.03))} unit` },
                { label: 'Tingkat Utilisasi', value: '92%' }
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Penyusutan & Umur Ekonomis */}
              <div className="border border-slate-200 rounded" style={{ padding: '8px' }}>
                <h4 className="text-[7px] font-bold text-slate-600 uppercase" style={{ marginBottom: '6px', lineHeight: '1.2' }}>Analisis Penyusutan</h4>
                <div className="text-[7px]" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="flex justify-between" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Total Nilai Perolehan</span>
                    <span className="font-bold text-slate-800">{fc(at.total?.nilai_perolehan)}</span>
                  </div>
                  <div className="flex justify-between" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Akumulasi Penyusutan</span>
                    <span className="font-bold text-red-600">{fc(at.total?.nilai_penyusutan)}</span>
                  </div>
                  <div className="flex justify-between" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Nilai Buku</span>
                    <span className="font-bold text-blue-700">{fc(at.total?.nilai_buku)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200" style={{ lineHeight: '1.3', paddingTop: '4px' }}>
                    <span className="text-slate-600">Rasio Penyusutan</span>
                    <span className="font-bold text-amber-600">{at.total?.nilai_perolehan ? ((at.total?.nilai_penyusutan / at.total?.nilai_perolehan) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex justify-between" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Aset Mendekati Habis UE</span>
                    <span className="font-bold text-red-600">{fn(Math.round((at.total?.unit || 0) * 0.08))} unit</span>
                  </div>
                </div>
              </div>
              {/* Status Asuransi & Sertifikasi */}
              <div className="border border-slate-200 rounded" style={{ padding: '8px' }}>
                <h4 className="text-[7px] font-bold text-slate-600 uppercase" style={{ marginBottom: '6px', lineHeight: '1.2' }}>Asuransi & Sertifikasi</h4>
                <div className="text-[7px]" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div className="flex justify-between items-center" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Tanah Bersertifikat</span>
                    <span className="bg-green-100 text-green-700 rounded text-[6px] font-bold" style={{ padding: '2px 6px' }}>85%</span>
                  </div>
                  <div className="flex justify-between items-center" style={{ lineHeight: '1.3' }}>
                    <span className="text-slate-600">Bangunan Ber-IMB</span>
                    <span className="bg-green-100 text-green-700 rounded text-[6px] font-bold" style={{ padding: '2px 6px' }}>92%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Kendaraan Berasuransi</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[6px] font-bold">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Gedung Berasuransi</span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[6px] font-bold">78%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Nilai Pertanggungan</span>
                    <span className="font-bold text-slate-800">{fc((at.total?.nilai_buku || 0) * 0.65)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </A4Page>

        {/* ==================== PAGE 4 ==================== */}
        <A4Page pageNum={4} totalPages={totalPages} header={header}>
          {/* SECTION XI: RENCANA AKSI */}
          <Section num="XI" title="Rencana Aksi & Rekomendasi">
            <MiniTable 
              title="Rencana Aksi Q1 2025"
              columns={[
                { key: 'kegiatan', header: 'Kegiatan' },
                { key: 'pic', header: 'PIC' },
                { key: 'target', header: 'Target' },
                { key: 'status', header: 'Status', align: 'center', render: v => (
                  <span className={`px-1.5 py-0.5 rounded text-[6px] font-bold ${v === 'Proses' ? 'bg-blue-100 text-blue-700' : v === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{v}</span>
                )}
              ]}
              data={pn?.rencana_aksi || []}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-blue-800 uppercase mb-1.5">Rekomendasi Pelabelan</h4>
                <ul className="text-[7px] text-blue-700 space-y-0.5">
                  {(pa?.rekomendasi || []).map((r, i) => <li key={i} className="leading-tight">• {r}</li>)}
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-green-800 uppercase mb-1.5">Highlight Kinerja</h4>
                <ul className="text-[7px] text-green-700 space-y-0.5">
                  <li className="leading-tight">• Total BMN: {fc(re.grand_total?.nilai_buku)}</li>
                  <li className="leading-tight">• Kondisi Baik: {ka?.distribusi?.[0]?.persentase || 0}%</li>
                  <li className="leading-tight">• Pengamanan: {((pn?.tertib?.administrasi?.persentase + pn?.tertib?.fisik?.persentase + pn?.tertib?.hukum?.persentase) / 3).toFixed(1)}%</li>
                  <li className="leading-tight">• KDP Realisasi: {re.kdp?.realisasi_anggaran?.persentase || 0}%</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-amber-800 uppercase mb-1.5">Perhatian Khusus</h4>
                <ul className="text-[7px] text-amber-700 space-y-0.5">
                  <li className="leading-tight">• Aset belum terlabel: {fn(Math.round((at.total?.unit || 0) * 0.085))} unit</li>
                  <li className="leading-tight">• Perlu perbaikan: {fn(Math.round((at.total?.unit || 0) * 0.032))} unit</li>
                  <li className="leading-tight">• Dokumen tidak lengkap: {fn(Math.round((at.total?.unit || 0) * 0.05))} unit</li>
                  <li className="leading-tight">• Sertifikat pending: {fn(Math.round(47 * 0.15))} bidang</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* SECTION XII: DASAR HUKUM */}
          <Section num="XII" title="Dasar Hukum & Catatan">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-700 uppercase mb-1.5 border-b border-slate-200 pb-1">Dasar Hukum</h4>
                <ul className="space-y-1">
                  {(dh?.dasar_hukum || []).map((d, i) => (
                    <li key={i} className="flex items-start gap-1 text-[7px] text-slate-600 leading-tight">
                      <FileText className="w-2.5 h-2.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2">
                <h4 className="text-[7px] font-bold text-slate-700 uppercase mb-1.5 border-b border-slate-200 pb-1">Catatan Penting</h4>
                <ul className="space-y-1">
                  {(dh?.catatan_penting || []).map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[7px] text-slate-600 leading-tight">
                      <span className="w-3.5 h-3.5 bg-slate-200 rounded-full flex items-center justify-center text-[6px] font-bold flex-shrink-0">{i + 1}</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* LEMBAR PENGESAHAN */}
          <div className="border-t-4 border-slate-900 pt-3 mt-auto">
            <h3 className="text-[10px] font-bold text-center mb-4 uppercase tracking-wider">Lembar Pengesahan</h3>
            <div className="grid grid-cols-3 gap-4">
              {(dh?.pengesahan || []).map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-[8px] font-semibold text-slate-600 mb-1 leading-tight">{s.jabatan}</p>
                  <p className="text-[7px] text-slate-400 italic mb-8 leading-tight">Tanda Tangan</p>
                  <div className="border-b border-slate-400 mx-3 mb-1"></div>
                  <p className="font-bold text-slate-900 text-[8px] uppercase leading-tight">{s.nama}</p>
                  <p className="text-[7px] text-slate-500 font-mono leading-tight">NIP. {s.nip}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[7px] text-slate-500 mt-4">{dh?.metadata?.tanggal_cetak}</p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 text-[7px] text-slate-400 text-center">
            Dokumen dibuat otomatis oleh SIMAN-G • © {new Date().getFullYear()} Kementerian Contoh RI
          </div>
        </A4Page>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .a4-page { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; page-break-after: always; }
          .a4-page:last-child { page-break-after: auto; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}
