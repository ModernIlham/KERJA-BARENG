import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { formatCurrency } from '../../lib/utils';

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
    <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-screen text-slate-900 print:p-0">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-8 no-print">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-1">Laporan Barang Milik Negara</h1>
        <p className="text-sm text-slate-500">Rekapitulasi nilai Barang Milik Negara per {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
      </div>

      {/* 1. Ringkasan Nilai Aset */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-600 pl-3">Ringkasan Nilai Aset</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nilai Perolehan */}
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Nilai Perolehan</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tanah</span>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatCurrency(nilai_aset.Tanah?.nilai_perolehan)}</div>
                    <div className="text-[10px] text-slate-400">{nilai_aset.Tanah?.count || 0} bidang</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Gedung & Bangunan</span>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatCurrency(nilai_aset["Gedung & Bangunan"]?.nilai_perolehan)}</div>
                    <div className="text-[10px] text-slate-400">{nilai_aset["Gedung & Bangunan"]?.count || 0} unit</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Peralatan & Mesin</span>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatCurrency(nilai_aset["Peralatan & Mesin"]?.nilai_perolehan)}</div>
                    <div className="text-[10px] text-slate-400">{nilai_aset["Peralatan & Mesin"]?.count || 0} unit</div>
                  </div>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold">
                  <span className="text-sm">Total</span>
                  <span>{formatCurrency(totalPerolehan)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Penyusutan */}
          <Card className="border shadow-none">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Penyusutan</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Akumulasi Penyusutan</div>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(penyusutan.total)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Metode</div>
                  <div className="text-sm font-medium">Garis Lurus</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Masa Manfaat Rata-rata</div>
                  <div className="text-sm font-medium">4-20 Tahun</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nilai Buku */}
          <Card className="border shadow-none bg-slate-50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Nilai Buku</h3>
              <div className="flex flex-col justify-center h-full space-y-4">
                <div>
                    <div className="text-xs text-slate-500 mb-1">Total Aset Tetap</div>
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(nilai_buku.total)}</div>
                </div>
                <div className="text-xs text-slate-400">
                    Nilai Perolehan dikurangi Akumulasi Penyusutan
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. Kondisi Aset */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-600 pl-3">Kondisi Aset</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-500 mb-4">Distribusi Kondisi</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">Baik</span>
                        </div>
                        <div className="text-sm font-bold">{kondisi.Baik} unit <span className="text-slate-400 font-normal">({calculatePercent(kondisi.Baik)}%)</span></div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{width: `${calculatePercent(kondisi.Baik)}%`}}></div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm font-medium">Rusak Ringan</span>
                        </div>
                        <div className="text-sm font-bold">{kondisi['Rusak Ringan']} unit <span className="text-slate-400 font-normal">({calculatePercent(kondisi['Rusak Ringan'])}%)</span></div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full" style={{width: `${calculatePercent(kondisi['Rusak Ringan'])}%`}}></div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm font-medium">Rusak Berat</span>
                        </div>
                        <div className="text-sm font-bold">{kondisi['Rusak Berat']} unit <span className="text-slate-400 font-normal">({calculatePercent(kondisi['Rusak Berat'])}%)</span></div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full" style={{width: `${calculatePercent(kondisi['Rusak Berat'])}%`}}></div>
                    </div>
                    
                    <div className="pt-2 border-t flex justify-between items-center text-sm font-bold">
                        <span>Total Aset</span>
                        <span>{kondisi.total} unit</span>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-500 mb-4">Catatan Kondisi</h3>
                <ul className="space-y-4 text-sm">
                    <li>
                        <div className="font-bold text-green-700">{calculatePercent(kondisi.Baik)}% Aset dalam Kondisi Baik</div>
                        <p className="text-slate-600 text-xs mt-1">Pemeliharaan rutin berjalan sesuai jadwal.</p>
                    </li>
                    <li>
                        <div className="font-bold text-yellow-700">{kondisi['Rusak Ringan']} Unit Perlu Perbaikan</div>
                        <p className="text-slate-600 text-xs mt-1">Diusulkan dalam anggaran pemeliharaan TA {new Date().getFullYear() + 1}.</p>
                    </li>
                    <li>
                        <div className="font-bold text-red-700">{kondisi['Rusak Berat']} Unit Diusulkan Penghapusan</div>
                        <p className="text-slate-600 text-xs mt-1">Proses penghapusan sesuai PMK 83/2016.</p>
                    </li>
                </ul>
            </div>
        </div>
      </section>

      {/* 3. Daftar Inventaris Barang */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-600 pl-3">Daftar Inventaris Barang</h2>
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="text-xs font-bold text-slate-700">Kode Barang</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Nama/Jenis Barang</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700">Merk/Type</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Tahun</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Kondisi</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Nilai Perolehan</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Akum. Penyusutan</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Nilai Buku</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {kib.map((item, idx) => (
                        <TableRow key={idx} className="border-b text-xs hover:bg-slate-50">
                            <TableCell className="font-mono">{item.kode_barang}</TableCell>
                            <TableCell className="font-medium">{item.nama_barang}</TableCell>
                            <TableCell>{item.merk} {item.tipe}</TableCell>
                            <TableCell className="text-center">{item.tahun_anggaran}</TableCell>
                            <TableCell className="text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                    item.kondisi === 'Baik' ? 'bg-green-50 text-green-700 border-green-200' :
                                    item.kondisi === 'Rusak Berat' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                    {item.kondisi}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.nilai_perolehan)}</TableCell>
                            <TableCell className="text-right text-slate-500">{formatCurrency(item.nilai_penyusutan)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(item.nilai_buku)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <TableCell colSpan={7} className="text-right uppercase text-xs">Total Nilai Buku (Halaman Ini)</TableCell>
                        <TableCell className="text-right text-xs">
                            {formatCurrency(kib.reduce((sum, item) => sum + (item.nilai_buku || 0), 0))}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 4. Mutasi Barang */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-l-4 border-blue-600 pl-3">Mutasi Barang</h2>
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="text-xs font-bold text-slate-700">Jenis Mutasi</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-center">Jumlah (Unit)</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 text-right">Nilai Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mutasi.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-500 py-4">Tidak ada mutasi tahun ini.</TableCell></TableRow>
                    ) : (
                        mutasi.map((m, idx) => (
                            <TableRow key={idx} className="text-xs border-b">
                                <TableCell className="font-medium">
                                    {m._id === 'MASUK' ? 'Pengadaan / Masuk' : 
                                     m._id === 'KELUAR' ? 'Penghapusan / Keluar' : m._id}
                                </TableCell>
                                <TableCell className="text-center">{m.qty} unit</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(m.total_nilai)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 5. Dasar Hukum & Catatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-xs text-slate-700">
        <div>
            <h4 className="font-bold mb-2 uppercase text-slate-500">Dasar Hukum:</h4>
            <ul className="list-disc pl-4 space-y-1">
                <li>UU No. 1 Tahun 2004 tentang Perbendaharaan Negara</li>
                <li>PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D</li>
                <li>PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN</li>
            </ul>
        </div>
        <div>
            <h4 className="font-bold mb-2 uppercase text-slate-500">Catatan:</h4>
            <p className="leading-relaxed">
                Laporan ini disusun berdasarkan data yang tercatat dalam Sistem Informasi Manajemen dan Akuntansi Barang Milik Negara (SIMAK-BMN) dan telah direkonsiliasi dengan Sistem Akuntansi Instansi (SAI) per tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
            </p>
        </div>
      </div>

      {/* 6. Lembar Pengesahan */}
      <section className="mt-12 break-inside-avoid">
        <h3 className="text-sm font-bold text-center mb-8 uppercase border-b pb-2">Lembar Pengesahan</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div className="space-y-16">
                <div>
                    <p>Operator SIMAK-BMN</p>
                </div>
                <div>
                    <p className="font-bold underline">Drs. Bambang Sutrisno, M.M.</p>
                    <p>NIP. 19700812 199503 1 002</p>
                </div>
            </div>
            <div className="space-y-16">
                <div>
                    <p>Pengelola BMN</p>
                </div>
                <div>
                    <p className="font-bold underline">Ir. Widodo Prasetyo, M.T.</p>
                    <p>NIP. 19750520 200112 1 001</p>
                </div>
            </div>
            <div className="space-y-16">
                <div>
                    <p>Kuasa Pengguna Barang</p>
                </div>
                <div>
                    <p className="font-bold underline">Dr. Sri Mulyani, S.E., M.Ak.</p>
                    <p>NIP. 19681110 199203 2 001</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}
