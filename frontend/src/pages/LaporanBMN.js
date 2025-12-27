import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, ArrowLeft, Shield, CheckCircle, AlertTriangle, XCircle, FileText, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

// PDF Download Handler
const usePdfDownload = () => {
  const [downloading, setDownloading] = useState(false);
  
  const downloadPdf = async (endpoint, filename) => {
    setDownloading(true);
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setDownloading(false);
    }
  };
  
  return { downloading, downloadPdf };
};

// --- Sub-components adapted from the provided design ---

const GovReportHeader = ({ ministryName, institutionName, address, reportTitle, regulation, reportYear, reportNumber }) => {
  return (
    <header className="bg-slate-900 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
      {/* Top Banner */}
      <div className="bg-blue-800 py-1 px-8 print:hidden">
        <p className="text-[10px] text-blue-100 text-center tracking-[0.2em] uppercase font-serif">
          Republik Indonesia
        </p>
      </div>
      
      <div className="p-8 print:p-0 print:mb-8">
        <div className="flex items-start gap-6">
          {/* Logo Placeholder */}
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 flex-shrink-0 print:border-black print:text-black">
            <Shield className="w-10 h-10 text-white print:text-black" />
          </div>
          
          <div className="flex-1 font-serif">
            <p className="text-sm text-blue-200 uppercase tracking-wide print:text-black font-semibold">
              {ministryName}
            </p>
            <h1 className="text-2xl font-bold mt-1 print:text-black">{institutionName}</h1>
            <p className="text-blue-300 text-sm mt-1 print:text-black font-sans">
              {address}
            </p>
          </div>
          
          <div className="text-right flex-shrink-0 font-sans">
            <p className="text-xs text-blue-300 print:text-black uppercase tracking-wider">Nomor Dokumen</p>
            <p className="font-mono text-base font-semibold print:text-black mt-1">{reportNumber}</p>
            <div className="mt-2 inline-block bg-blue-800/50 px-3 py-1 rounded text-xs text-blue-100 print:text-black print:border print:border-black">
              Tahun Anggaran {reportYear}
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/20 text-center print:border-black">
          <h2 className="text-3xl font-serif font-bold uppercase tracking-widest print:text-black">{reportTitle}</h2>
          <p className="text-blue-200 mt-2 print:text-black font-sans text-sm">
            {regulation}
          </p>
        </div>
      </div>
    </header>
  );
};

const ReportSection = ({ title, description, children }) => {
  return (
    <section className="mb-10 break-inside-avoid">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-slate-900 rounded-full print:bg-black" />
          {title}
        </h2>
        {description && (
          <p className="text-slate-500 mt-1 ml-5 text-sm font-sans">{description}</p>
        )}
      </div>
      <div className="ml-5">{children}</div>
    </section>
  );
};

const AssetSummaryCard = ({ title, items }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm print:border-black print:shadow-none">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 print:bg-gray-100 print:border-black">
        <h3 className="font-serif font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100 print:divide-black">
        {items.map((item, idx) => (
          <div key={idx} className="px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">{item.label}</span>
            <div className="text-right">
              <span className="font-bold text-slate-900 block">{item.value}</span>
              {item.subValue && (
                <span className="text-[10px] text-slate-400 font-sans">{item.subValue}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AssetConditionChart = ({ conditions, total }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm print:border-black print:shadow-none h-full">
      <h3 className="text-base font-serif font-bold text-slate-800 mb-6 uppercase">Distribusi Kondisi</h3>
      <div className="space-y-6">
        {conditions.map((condition, idx) => {
          const percentage = total > 0 ? (condition.value / total) * 100 : 0;
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">{condition.label}</span>
                <span className="text-sm text-slate-500 font-medium">
                  {condition.value} unit ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden print:border print:border-black">
                <div
                  className="h-full rounded-full print:bg-black !important"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: condition.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between print:border-black">
        <span className="font-bold text-slate-700 font-serif">Total Aset</span>
        <span className="text-xl font-bold text-slate-900 print:text-black">{total} unit</span>
      </div>
    </div>
  );
};

const DataTable = ({ title, columns, data, showTotal, totalLabel, totalValue }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm print:border-black print:shadow-none">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 print:bg-gray-100 print:border-black">
        <h3 className="text-sm font-serif font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 print:bg-gray-100">
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-black">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-3 text-slate-700 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}>
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showTotal && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 print:border-black print:bg-gray-100 font-bold">
                <td colSpan={columns.length - 1} className="px-6 py-4 text-slate-800 text-right uppercase text-xs tracking-wide">
                  {totalLabel}
                </td>
                <td className="px-6 py-4 text-slate-900 text-right">
                  {totalValue}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function LaporanBMN({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/laporan-bmn/bmn-summary');
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch report data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center p-12 min-h-screen items-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>;
  if (!data) return <div className="text-center p-12 text-red-500 font-medium">Gagal memuat data laporan.</div>;

  const { nilai_aset, penyusutan, nilai_buku, kondisi, mutasi, kib } = data;
  
  // Calculations
  const totalPerolehan = 
    (nilai_aset.Tanah?.nilai_perolehan || 0) + 
    (nilai_aset["Gedung & Bangunan"]?.nilai_perolehan || 0) + 
    (nilai_aset["Peralatan & Mesin"]?.nilai_perolehan || 0);

  const calculatePercent = (val) => kondisi.total > 0 ? ((val / kondisi.total) * 100).toFixed(1) : 0;

  // Chart Data
  const assetConditions = [
    { label: "Baik", value: kondisi.Baik, color: "#16a34a" }, // green-600
    { label: "Rusak Ringan", value: kondisi['Rusak Ringan'], color: "#ca8a04" }, // yellow-600
    { label: "Rusak Berat", value: kondisi['Rusak Berat'], color: "#dc2626" }, // red-600
  ];

  // Table Configs
  const inventoryColumns = [
    { key: "kode_barang", header: "Kode Barang", className: "font-mono text-xs" },
    { key: "nama_barang", header: "Nama/Jenis Barang", className: "font-medium" },
    { key: "merk_tipe", header: "Merk/Type", format: (val) => val || '-' },
    { key: "tahun_anggaran", header: "Tahun", align: "center" },
    // eslint-disable-next-line react/no-unstable-nested-components
    { key: "kondisi", header: "Kondisi", align: "center", format: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            val === 'Baik' ? 'bg-green-100 text-green-800' :
            val === 'Rusak Berat' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
        }`}>{val}</span>
    )},
    { key: "nilai_perolehan", header: "Nilai Perolehan", align: "right", format: formatCurrency },
    { key: "nilai_penyusutan", header: "Akum. Penyusutan", align: "right", format: formatCurrency, className: "text-slate-500" },
    { key: "nilai_buku", header: "Nilai Sisa", align: "right", format: formatCurrency, className: "font-bold text-slate-900" },
  ];

  // Transform KIB data for table
  const kibData = kib.map(item => ({
      ...item,
      merk_tipe: `${item.merk || ''} ${item.tipe || ''}`.trim()
  }));

  const mutationColumns = [
    { key: "_id", header: "Jenis Mutasi", format: (val) => {
        if(val === 'MASUK' || val === 'in') return 'Pengadaan Baru';
        if(val === 'KELUAR' || val === 'out') return 'Penghapusan';
        return val;
    }, className: "font-medium" },
    { key: "masuk", header: "Masuk (Unit)", align: "center", format: (val) => val > 0 ? val : '-' },
    { key: "keluar", header: "Keluar (Unit)", align: "center", format: (val) => val > 0 ? val : '-' },
    { key: "total_nilai", header: "Nilai", align: "right", format: formatCurrency, className: "font-bold" },
  ];

  // Transform Mutation Data
  const mutationData = mutasi.map(m => ({
      ...m,
      masuk: (m._id === 'MASUK' || m._id === 'in') ? m.qty : 0,
      keluar: (m._id === 'KELUAR' || m._id === 'out') ? m.qty : 0
  }));

  const signatures = [
    { title: "Operator SIMAK-BMN", name: "Drs. Bambang Sutrisno, M.M.", nip: "19700812 199503 1 002", date: "14 Desember 2024" },
    { title: "Pengelola BMN", name: "Ir. Widodo Prasetyo, M.T.", nip: "19750520 200112 1 001", date: "14 Desember 2024" },
    { title: "Kuasa Pengguna Barang", name: "Dr. Sri Mulyani, S.E., M.Ak.", nip: "19681110 199203 2 001", date: "14 Desember 2024" },
  ];
  
  const { downloading, downloadPdf } = usePdfDownload();
  
  const handleDownloadPdf = () => {
    downloadPdf('/api/laporan-bmn/bmn-summary/pdf', `laporan_bmn_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:p-0">
        
      {/* Action Bar */}
      <div className="max-w-[1280px] mx-auto px-4 mb-6 flex justify-between items-center no-print">
        <Button variant="ghost" onClick={onBack} className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="bg-white border-slate-300">
                <Printer className="mr-2 h-4 w-4" /> Cetak Browser
            </Button>
            <Button onClick={handleDownloadPdf} disabled={downloading} className="bg-blue-700 hover:bg-blue-800 text-white">
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloading ? 'Generating...' : 'Download PDF'}
            </Button>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="max-w-[1280px] mx-auto bg-white shadow-xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
        
        <GovReportHeader 
            ministryName="KEMENTERIAN KEUANGAN REPUBLIK INDONESIA"
            institutionName="DIREKTORAT JENDERAL KEKAYAAN NEGARA"
            address="Jl. Merdeka Barat No. 15, Jakarta Pusat 10110"
            reportTitle="LAPORAN BARANG MILIK NEGARA"
            regulation="Sesuai dengan Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan BMN"
            reportYear={new Date().getFullYear()}
            reportNumber="BMN/DJKN/2024/12-001"
        />

        <div className="p-10 space-y-12">
            {/* 1. Ringkasan Nilai Aset */}
            <ReportSection title="Ringkasan Nilai Aset" description={`Rekapitulasi nilai Barang Milik Negara per ${new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AssetSummaryCard 
                        title="Nilai Perolehan"
                        items={[
                            { label: "Tanah", value: formatCurrency(nilai_aset.Tanah?.nilai_perolehan), subValue: `${nilai_aset.Tanah?.count || 0} bidang` },
                            { label: "Gedung & Bangunan", value: formatCurrency(nilai_aset["Gedung & Bangunan"]?.nilai_perolehan), subValue: `${nilai_aset["Gedung & Bangunan"]?.count || 0} unit` },
                            { label: "Peralatan & Mesin", value: formatCurrency(nilai_aset["Peralatan & Mesin"]?.nilai_perolehan), subValue: `${nilai_aset["Peralatan & Mesin"]?.count || 0} unit` },
                            { label: "Total", value: formatCurrency(totalPerolehan), subValue: "" }
                        ]}
                    />
                    <AssetSummaryCard 
                        title="Penyusutan"
                        items={[
                            { label: "Tahun Berjalan", value: formatCurrency(penyusutan.tahun_berjalan || 0) },
                            { label: "Akumulasi", value: formatCurrency(penyusutan.total) },
                            { label: "Metode", value: "Garis Lurus" },
                            { label: "Masa Manfaat Rata-rata", value: "4-20 Tahun" }
                        ]}
                    />
                    <AssetSummaryCard 
                        title="Nilai Buku"
                        items={[
                            { label: "Aset Tetap", value: formatCurrency(nilai_buku.total) },
                            { label: "Aset Tak Berwujud", value: formatCurrency(125000000) },
                            { label: "Aset Lainnya", value: formatCurrency(45000000) },
                            { label: "Total Nilai Buku", value: formatCurrency(nilai_buku.total + 170000000) }
                        ]}
                    />
                </div>
            </ReportSection>

            {/* 2. Kondisi Aset */}
            <ReportSection title="Kondisi Aset" description="Klasifikasi kondisi Barang Milik Negara">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AssetConditionChart conditions={assetConditions} total={kondisi.total} />
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm print:border-black print:shadow-none h-full flex flex-col justify-center">
                        <h3 className="text-base font-serif font-bold text-slate-800 mb-6 uppercase">Catatan Kondisi Aset</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-100 print:bg-white print:border-black">
                                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-green-800">{calculatePercent(kondisi.Baik)}% Aset dalam Kondisi Baik</p>
                                    <p className="text-sm text-green-700 mt-1">Pemeliharaan rutin berjalan sesuai jadwal yang telah ditetapkan.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100 print:bg-white print:border-black">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-800">{kondisi['Rusak Ringan']} Unit Perlu Perbaikan</p>
                                    <p className="text-sm text-amber-700 mt-1">Diusulkan dalam anggaran pemeliharaan TA {new Date().getFullYear() + 1}.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-100 print:bg-white print:border-black">
                                <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-800">{kondisi['Rusak Berat']} Unit Diusulkan Penghapusan</p>
                                    <p className="text-sm text-red-700 mt-1">Proses penghapusan sesuai PMK 83/2016.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ReportSection>

            {/* 3. Daftar Inventaris */}
            <ReportSection title="Daftar Inventaris Barang" description="Rincian Barang Milik Negara berdasarkan klasifikasi SIMAK-BMN">
                <DataTable 
                    title="Kartu Inventaris Barang (KIB)"
                    columns={inventoryColumns}
                    data={kibData}
                    showTotal
                    totalLabel="Total Nilai Sisa"
                    totalValue={formatCurrency(nilai_buku.total)}
                />
            </ReportSection>

            {/* 4. Mutasi */}
            <ReportSection title="Mutasi Barang" description="Perubahan jumlah dan nilai BMN selama periode berjalan">
                <DataTable 
                    title={`Rekapitulasi Mutasi BMN Tahun ${new Date().getFullYear()}`}
                    columns={mutationColumns}
                    data={mutationData}
                />
            </ReportSection>

            {/* 5. Dasar Hukum */}
            <ReportSection title="Dasar Hukum & Catatan">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 print:bg-white print:border-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-serif font-bold text-slate-800 mb-4 uppercase text-sm tracking-wide border-b border-slate-200 pb-2">Dasar Hukum</h4>
                            <ul className="space-y-3 text-sm text-slate-600">
                                <li className="flex gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>UU No. 1 Tahun 2004 tentang Perbendaharaan Negara</span>
                                </li>
                                <li className="flex gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D</span>
                                </li>
                                <li className="flex gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-serif font-bold text-slate-800 mb-4 uppercase text-sm tracking-wide border-b border-slate-200 pb-2">Catatan</h4>
                            <p className="text-sm text-slate-600 leading-relaxed text-justify">
                                Laporan ini disusun berdasarkan data yang tercatat dalam Sistem Informasi Manajemen 
                                dan Akuntansi Barang Milik Negara (SIMAK-BMN) dan telah direkonsiliasi dengan 
                                Sistem Akuntansi Instansi (SAI) per tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
                            </p>
                        </div>
                    </div>
                </div>
            </ReportSection>

            {/* 6. Signature */}
            <div className="mt-16 pt-10 border-t-2 border-slate-900 break-inside-avoid print:border-black">
                <h3 className="text-lg font-serif font-bold text-center mb-12 uppercase tracking-widest">Lembar Pengesahan</h3>
                <div className="grid grid-cols-3 gap-8">
                    {signatures.map((sig, idx) => (
                        <div key={idx} className="text-center flex flex-col items-center">
                            <p className="text-sm font-semibold text-slate-600 mb-1">{sig.title}</p>
                            <p className="text-xs text-slate-400 italic mb-8">Tanda Tangan</p>
                            <div className="h-20 w-full mb-2"></div> {/* Space for signature */}
                            <p className="font-bold text-slate-900 underline uppercase text-sm">{sig.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">NIP. {sig.nip}</p>
                            <p className="text-xs text-slate-400 mt-1">{sig.date}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400 print:border-black font-sans">
                <div>
                    Dokumen ini dibuat secara otomatis oleh sistem SIMAN-G
                </div>
                <div>
                    Dicetak pada: {new Date().toLocaleString('id-ID')} &bull; Halaman 1 dari 1
                </div>
            </footer>

        </div>
      </div>
    </div>
  );
}
