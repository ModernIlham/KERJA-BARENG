import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, Share2, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { formatCurrency } from '../lib/utils';

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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="text-center p-8">Gagal memuat data laporan.</div>;

  const { nilai_aset, penyusutan, nilai_buku, kondisi, mutasi, kib } = data;
  
  // Calculate Totals
  const totalPerolehan = 
    (nilai_aset.Tanah?.nilai_perolehan || 0) + 
    (nilai_aset["Gedung & Bangunan"]?.nilai_perolehan || 0) + 
    (nilai_aset["Peralatan & Mesin"]?.nilai_perolehan || 0);

  const calculatePercent = (val) => kondisi.total > 0 ? ((val / kondisi.total) * 100).toFixed(1) : 0;

  return (
    <div className="w-full bg-slate-50 min-h-screen font-sans">
      {/* Top Navigation Bar (Back Button) - Outside the Report Paper */}
      <div className="max-w-[1280px] mx-auto px-8 py-4 no-print">
        <Button variant="ghost" onClick={onBack} className="text-slate-600 hover:text-slate-900 pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
        </Button>
      </div>

      {/* Report Container (The Paper) */}
      <div className="max-w-[1280px] mx-auto bg-white shadow-lg print:shadow-none min-h-screen">
        
        {/* HEADER SECTION - Dark Blue Branding */}
        <div className="bg-[#002A52] text-white p-8">
            <div className="flex justify-between items-start">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-200 text-sm font-medium">
                        <span>Laporan Keuangan</span>
                        <span>/</span>
                        <span>Laporan BMN</span>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        {/* Placeholder Logo */}
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                            <Building2 className="text-white h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold tracking-wider text-blue-100">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA</h2>
                            <h3 className="text-xs text-blue-300">DIREKTORAT JENDERAL KEKAYAAN NEGARA</h3>
                            <p className="text-[10px] text-blue-400 mt-1">Jl. Merdeka Barat No. 15, Jakarta Pusat 10110</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h1 className="text-3xl font-bold tracking-tight">LAPORAN BARANG MILIK NEGARA</h1>
                        <p className="text-blue-200 text-sm mt-1">Sesuai dengan Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan BMN</p>
                    </div>
                </div>

                <div className="text-right space-y-4">
                    <div className="space-y-1">
                        <div className="text-xs text-blue-300">Tahun Anggaran</div>
                        <div className="text-xl font-bold">{new Date().getFullYear()}</div>
                    </div>
                    
                    <div className="flex gap-2 justify-end no-print">
                        <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-none" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" /> Cetak
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                            <Download className="mr-2 h-4 w-4" /> Unduh PDF
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* CONTENT BODY */}
        <div className="p-8 space-y-10">
            
            {/* 1. Ringkasan Nilai Aset */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Ringkasan Nilai Aset</h2>
                        <p className="text-sm text-gray-500">Rekapitulasi nilai BMN per {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Nilai Perolehan */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Nilai Perolehan</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 text-sm">Tanah</span>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">{formatCurrency(nilai_aset.Tanah?.nilai_perolehan)}</div>
                                    <div className="text-xs text-gray-400">{nilai_aset.Tanah?.count || 0} unit</div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 text-sm">Gedung</span>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">{formatCurrency(nilai_aset["Gedung & Bangunan"]?.nilai_perolehan)}</div>
                                    <div className="text-xs text-gray-400">{nilai_aset["Gedung & Bangunan"]?.count || 0} unit</div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 text-sm">Peralatan</span>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">{formatCurrency(nilai_aset["Peralatan & Mesin"]?.nilai_perolehan)}</div>
                                    <div className="text-xs text-gray-400">{nilai_aset["Peralatan & Mesin"]?.count || 0} unit</div>
                                </div>
                            </div>
                            <div className="pt-3 mt-1 border-t flex justify-between items-center bg-gray-50 -mx-6 px-6 -mb-6 py-3 rounded-b-xl">
                                <span className="font-bold text-gray-700">Total</span>
                                <span className="font-bold text-blue-800">{formatCurrency(totalPerolehan)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Penyusutan */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Penyusutan</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Akumulasi Penyusutan</div>
                                <div className="text-2xl font-bold text-gray-800">{formatCurrency(penyusutan.total)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-xs text-gray-500">Metode</div>
                                    <div className="font-medium">Garis Lurus</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Masa Manfaat</div>
                                    <div className="font-medium">4-20 Tahun</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Nilai Buku */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Nilai Buku</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Aset Tetap</span>
                                <span className="font-bold text-slate-900">{formatCurrency(nilai_buku.total)}</span>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Total Nilai Buku</div>
                                <div className="text-3xl font-extrabold text-blue-700">{formatCurrency(nilai_buku.total)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Kondisi Aset */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Kondisi Aset</h2>
                        <p className="text-sm text-gray-500">Klasifikasi kondisi Barang Milik Negara</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Chart */}
                    <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-6">Distribusi Kondisi</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-green-700">Baik</span>
                                    <span className="font-bold">{calculatePercent(kondisi.Baik)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{width: `${calculatePercent(kondisi.Baik)}%`}}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right">{kondisi.Baik} unit</div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-amber-600">Rusak Ringan</span>
                                    <span className="font-bold">{calculatePercent(kondisi['Rusak Ringan'])}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-amber-400 h-full" style={{width: `${calculatePercent(kondisi['Rusak Ringan'])}%`}}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right">{kondisi['Rusak Ringan']} unit</div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-red-600">Rusak Berat</span>
                                    <span className="font-bold">{calculatePercent(kondisi['Rusak Berat'])}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full" style={{width: `${calculatePercent(kondisi['Rusak Berat'])}%`}}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right">{kondisi['Rusak Berat']} unit</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Insight Cards */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-100 rounded-xl p-5 flex flex-col justify-between">
                            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                                <CheckCircle2 className="text-green-600 h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-700 mb-1">{calculatePercent(kondisi.Baik)}%</div>
                                <div className="text-sm font-semibold text-green-800">Kondisi Baik</div>
                                <p className="text-xs text-green-600 mt-2">Aset dalam kondisi prima, pemeliharaan rutin berjalan.</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex flex-col justify-between">
                            <div className="bg-amber-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                                <AlertTriangle className="text-amber-600 h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-700 mb-1">{kondisi['Rusak Ringan']}</div>
                                <div className="text-sm font-semibold text-amber-800">Perlu Perbaikan</div>
                                <p className="text-xs text-amber-600 mt-2">Diusulkan untuk pemeliharaan TA {new Date().getFullYear() + 1}.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col justify-between">
                            <div className="bg-red-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                                <XCircle className="text-red-600 h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-700 mb-1">{kondisi['Rusak Berat']}</div>
                                <div className="text-sm font-semibold text-red-800">Usul Penghapusan</div>
                                <p className="text-xs text-red-600 mt-2">Proses penghapusan sesuai PMK 83/2016.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Daftar Inventaris */}
            <section>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Daftar Inventaris Barang</h2>
                    <p className="text-sm text-gray-500">Rincian Top 50 Aset Berdasarkan Nilai Perolehan</p>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                                <TableHead className="font-bold text-gray-700">KODE BARANG</TableHead>
                                <TableHead className="font-bold text-gray-700">NAMA BARANG</TableHead>
                                <TableHead className="font-bold text-gray-700">MERK / TIPE</TableHead>
                                <TableHead className="font-bold text-gray-700 text-center">TAHUN</TableHead>
                                <TableHead className="font-bold text-gray-700 text-center">KONDISI</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">NILAI PEROLEHAN</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">PENYUSUTAN</TableHead>
                                <TableHead className="font-bold text-gray-700 text-right">NILAI SISA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kib.map((item, idx) => (
                                <TableRow key={idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-gray-600 font-medium">{item.kode_barang}</TableCell>
                                    <TableCell className="text-sm font-medium text-gray-900">{item.nama_barang}</TableCell>
                                    <TableCell className="text-sm text-gray-500">{item.merk} {item.tipe}</TableCell>
                                    <TableCell className="text-center text-sm text-gray-500">{item.tahun_anggaran}</TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            item.kondisi === 'Rusak Berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                                            'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {item.kondisi}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-gray-900">{formatCurrency(item.nilai_perolehan)}</TableCell>
                                    <TableCell className="text-right text-sm text-gray-400">{formatCurrency(item.nilai_penyusutan)}</TableCell>
                                    <TableCell className="text-right text-sm font-bold text-gray-900">{formatCurrency(item.nilai_buku)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* 4. Mutasi */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Rekapitulasi Mutasi</h2>
                    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                                    <TableHead className="text-xs font-bold uppercase">Jenis Mutasi</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-right">Jumlah</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-right">Nilai</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mutasi.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-xs text-gray-400">Nihil</TableCell></TableRow>
                                ) : mutasi.map((m, idx) => (
                                    <TableRow key={idx} className="border-b border-gray-100">
                                        <TableCell className="text-xs font-medium uppercase text-gray-700">
                                            {m._id === 'MASUK' ? 'Pengadaan' : m._id === 'KELUAR' ? 'Penghapusan' : m._id}
                                        </TableCell>
                                        <TableCell className="text-xs text-right">{m.qty} unit</TableCell>
                                        <TableCell className="text-xs text-right font-bold">{formatCurrency(m.total_nilai)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Dasar Hukum</h3>
                        <ul className="list-disc pl-4 space-y-2 text-sm text-gray-600">
                            <li>UU No. 1 Tahun 2004 tentang Perbendaharaan Negara</li>
                            <li>PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D</li>
                            <li>PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN</li>
                        </ul>
                    </div>
                    <div className="text-xs text-gray-400 italic">
                        * Data direkonsiliasi otomatis dari SIMAK-BMN pada {new Date().toLocaleDateString('id-ID')}.
                    </div>
                </div>
            </section>

            {/* 5. Signatures */}
            <section className="mt-12 pt-12 border-t border-gray-200 break-inside-avoid">
                <div className="grid grid-cols-3 gap-8 text-center text-gray-800">
                    <div className="flex flex-col h-32 justify-between">
                        <div>
                            <p className="text-sm font-semibold">Mengetahui,</p>
                            <p className="text-xs text-gray-500">Operator SIMAK-BMN</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold underline">Drs. Bambang Sutrisno, M.M.</p>
                            <p className="text-xs">NIP. 19700812 199503 1 002</p>
                        </div>
                    </div>
                    <div className="flex flex-col h-32 justify-between">
                        <div>
                            <p className="text-sm font-semibold">Disetujui,</p>
                            <p className="text-xs text-gray-500">Pengelola BMN</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold underline">Ir. Widodo Prasetyo, M.T.</p>
                            <p className="text-xs">NIP. 19750520 200112 1 001</p>
                        </div>
                    </div>
                    <div className="flex flex-col h-32 justify-between">
                        <div>
                            <p className="text-sm font-semibold">Disahkan,</p>
                            <p className="text-xs text-gray-500">Kuasa Pengguna Barang</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold underline">Dr. Sri Mulyani, S.E., M.Ak.</p>
                            <p className="text-xs">NIP. 19681110 199203 2 001</p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
      </div>
    </div>
  );
}
