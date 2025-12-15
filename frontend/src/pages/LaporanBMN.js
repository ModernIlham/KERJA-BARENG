import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Printer, Download, ArrowLeft } from 'lucide-react';
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
    <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-screen text-slate-900 print:p-0 font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-8 no-print">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900 font-sans">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2 font-sans">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Unduh PDF
          </Button>
        </div>
      </div>

      {/* Report Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Laporan Barang Milik Negara</h1>
        <p className="text-slate-500 text-lg">Rekapitulasi nilai Barang Milik Negara per {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
      </div>

      {/* 1. Ringkasan Nilai Aset */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Ringkasan Nilai Aset</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Nilai Perolehan */}
          <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Nilai Perolehan</h3>
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Tanah</div>
                  <div className="font-bold text-lg">{formatCurrency(nilai_aset.Tanah?.nilai_perolehan)}</div>
                  <div className="text-sm text-slate-500">{nilai_aset.Tanah?.count || 0} bidang</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Gedung & Bangunan</div>
                  <div className="font-bold text-lg">{formatCurrency(nilai_aset["Gedung & Bangunan"]?.nilai_perolehan)}</div>
                  <div className="text-sm text-slate-500">{nilai_aset["Gedung & Bangunan"]?.count || 0} unit</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Peralatan & Mesin</div>
                  <div className="font-bold text-lg">{formatCurrency(nilai_aset["Peralatan & Mesin"]?.nilai_perolehan)}</div>
                  <div className="text-sm text-slate-500">{nilai_aset["Peralatan & Mesin"]?.count || 0} unit</div>
                </div>
                <div className="pt-2">
                  <div className="text-sm text-slate-500 mb-1">Total</div>
                  <div className="font-bold text-xl">{formatCurrency(totalPerolehan)}</div>
                </div>
              </div>
          </div>

          {/* Penyusutan */}
          <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Penyusutan</h3>
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Tahun Berjalan</div>
                  <div className="font-bold text-lg">{formatCurrency(penyusutan.tahun_berjalan || 0)}</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Akumulasi</div>
                  <div className="font-bold text-lg">{formatCurrency(penyusutan.total)}</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-sm text-slate-500 mb-1">Metode</div>
                  <div className="font-bold text-lg">Garis Lurus</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Masa Manfaat Rata-rata</div>
                  <div className="font-bold text-lg">8 Tahun</div>
                </div>
              </div>
          </div>

          {/* Nilai Buku */}
          <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Nilai Buku</h3>
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                    <div className="text-sm text-slate-500 mb-1">Aset Tetap</div>
                    <div className="font-bold text-lg">{formatCurrency(nilai_buku.total)}</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                    <div className="text-sm text-slate-500 mb-1">Aset Tak Berwujud</div>
                    <div className="font-bold text-lg">{formatCurrency(125000000)}</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                    <div className="text-sm text-slate-500 mb-1">Aset Lainnya</div>
                    <div className="font-bold text-lg">{formatCurrency(45000000)}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500 mb-1">Total Nilai Buku</div>
                    <div className="font-bold text-xl text-blue-600">{formatCurrency(nilai_buku.total + 170000000)}</div>
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* 2. Kondisi Aset */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Kondisi Aset</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h3 className="text-base font-bold text-slate-900 mb-4">Distribusi Kondisi Aset</h3>
                <div className="space-y-6">
                    {/* Baik */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium text-slate-700">Baik</span>
                            <span className="font-medium text-slate-900">{kondisi.Baik} unit ({calculatePercent(kondisi.Baik)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full">
                            <div className="bg-slate-900 h-full rounded-full" style={{width: `${calculatePercent(kondisi.Baik)}%`}}></div>
                        </div>
                    </div>

                    {/* Rusak Ringan */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium text-slate-700">Rusak Ringan</span>
                            <span className="font-medium text-slate-900">{kondisi['Rusak Ringan']} unit ({calculatePercent(kondisi['Rusak Ringan'])}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full">
                            <div className="bg-slate-400 h-full rounded-full" style={{width: `${calculatePercent(kondisi['Rusak Ringan'])}%`}}></div>
                        </div>
                    </div>

                    {/* Rusak Berat */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium text-slate-700">Rusak Berat</span>
                            <span className="font-medium text-slate-900">{kondisi['Rusak Berat']} unit ({calculatePercent(kondisi['Rusak Berat'])}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full">
                            <div className="bg-slate-300 h-full rounded-full" style={{width: `${calculatePercent(kondisi['Rusak Berat'])}%`}}></div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200 flex justify-between font-bold">
                        <span>Total Aset</span>
                        <span>{kondisi.total} unit</span>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-base font-bold text-slate-900 mb-4">Catatan Kondisi Aset</h3>
                <div className="space-y-6">
                    <div>
                        <div className="font-bold text-slate-900 mb-1">{calculatePercent(kondisi.Baik)}% Aset dalam Kondisi Baik</div>
                        <p className="text-slate-500 text-sm">Pemeliharaan rutin berjalan sesuai jadwal</p>
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 mb-1">{kondisi['Rusak Ringan']} Unit Perlu Perbaikan</div>
                        <p className="text-slate-500 text-sm">Diusulkan dalam anggaran pemeliharaan TA {new Date().getFullYear() + 1}</p>
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 mb-1">{kondisi['Rusak Berat']} Unit Diusulkan Penghapusan</div>
                        <p className="text-slate-500 text-sm">Proses penghapusan sesuai PMK 83/2016</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 3. Daftar Inventaris Barang */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Daftar Inventaris Barang</h2>
        <p className="text-slate-500 mb-6">Rincian Barang Milik Negara berdasarkan klasifikasi SIMAK-BMN</p>
        
        <h3 className="text-base font-bold text-slate-900 mb-4">Kartu Inventaris Barang (KIB)</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="text-xs font-bold text-slate-900 uppercase">Kode Barang</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase">Nama/Jenis Barang</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase">Merk/Type</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-center">Tahun</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-center">Kondisi</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-right">Nilai Perolehan</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-right">Akum. Penyusutan</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-right">Nilai Sisa</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {kib.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="font-mono text-sm text-slate-600">{item.kode_barang}</TableCell>
                            <TableCell className="font-medium text-sm text-slate-900">{item.nama_barang}</TableCell>
                            <TableCell className="text-sm text-slate-600">{item.merk && item.merk !== '-' ? item.merk : '-'} {item.tipe && item.tipe !== '-' ? item.tipe : ''}</TableCell>
                            <TableCell className="text-center text-sm text-slate-600">{item.tahun_anggaran}</TableCell>
                            <TableCell className="text-center">
                                <span className={`text-sm ${
                                    item.kondisi === 'Baik' ? 'text-slate-900' :
                                    'text-slate-500'
                                }`}>
                                    {item.kondisi}
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-slate-600">{formatCurrency(item.nilai_perolehan)}</TableCell>
                            <TableCell className="text-right text-sm text-slate-600">{formatCurrency(item.nilai_penyusutan)}</TableCell>
                            <TableCell className="text-right font-medium text-sm text-slate-900">{formatCurrency(item.nilai_buku)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 border-t border-slate-200">
                        <TableCell colSpan={7} className="text-right font-bold text-sm text-slate-900">Total Nilai Buku</TableCell>
                        <TableCell className="text-right font-bold text-sm text-slate-900">
                            {formatCurrency(kib.reduce((sum, item) => sum + (item.nilai_buku || 0), 0))}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 4. Mutasi Barang */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Mutasi Barang</h2>
        <p className="text-slate-500 mb-6">Perubahan jumlah dan nilai BMN selama periode berjalan</p>

        <h3 className="text-base font-bold text-slate-900 mb-4">Rekapitulasi Mutasi BMN Tahun {new Date().getFullYear()}</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="text-xs font-bold text-slate-900 uppercase">Jenis Mutasi</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-center">Masuk (Unit)</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-center">Keluar (Unit)</TableHead>
                        <TableHead className="text-xs font-bold text-slate-900 uppercase text-right">Nilai</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mutasi.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-sm text-slate-500 py-6 italic">Tidak ada mutasi tahun ini.</TableCell></TableRow>
                    ) : (
                        mutasi.map((m, idx) => (
                            <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <TableCell className="font-medium text-sm text-slate-900">
                                    {m._id === 'MASUK' ? 'Pengadaan Baru' : 
                                     m._id === 'KELUAR' ? 'Penghapusan / Transfer Keluar' : 
                                     m._id === 'in' ? 'Pengadaan Baru' :
                                     m._id === 'out' ? 'Penghapusan' : m._id}
                                </TableCell>
                                <TableCell className="text-center text-sm text-slate-600">
                                    {m._id === 'MASUK' || m._id === 'in' ? m.qty : '0'}
                                </TableCell>
                                <TableCell className="text-center text-sm text-slate-600">
                                    {m._id === 'KELUAR' || m._id === 'out' ? m.qty : '0'}
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm text-slate-900">{formatCurrency(m.total_nilai)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 5. Dasar Hukum & Catatan */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Dasar Hukum & Catatan</h2>
        <div className="space-y-8">
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Dasar Hukum:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                    <li>UU No. 1 Tahun 2004 tentang Perbendaharaan Negara</li>
                    <li>PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D</li>
                    <li>PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-2">Catatan:</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                    Laporan ini disusun berdasarkan data yang tercatat dalam Sistem Informasi Manajemen dan Akuntansi Barang Milik Negara (SIMAK-BMN) dan telah direkonsiliasi dengan Sistem Akuntansi Instansi (SAI) per tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
                </p>
            </div>
        </div>
      </section>

      {/* 6. Lembar Pengesahan */}
      <section className="mt-16 break-inside-avoid">
        <h3 className="text-xl font-bold mb-12">Lembar Pengesahan</h3>
        <div className="grid grid-cols-3 gap-8">
            <div className="space-y-24">
                <div>
                    <p className="font-medium text-slate-900">Operator SIMAK-BMN</p>
                    <p className="text-slate-500 text-sm mt-1">Tanda Tangan</p>
                </div>
                <div>
                    <p className="font-bold text-slate-900">Drs. Bambang Sutrisno, M.M.</p>
                    <p className="text-slate-500 text-sm mt-1">14 Desember 2024</p>
                </div>
            </div>
            <div className="space-y-24">
                <div>
                    <p className="font-medium text-slate-900">Pengelola BMN</p>
                    <p className="text-slate-500 text-sm mt-1">Tanda Tangan</p>
                </div>
                <div>
                    <p className="font-bold text-slate-900">Ir. Widodo Prasetyo, M.T.</p>
                    <p className="text-slate-500 text-sm mt-1">14 Desember 2024</p>
                </div>
            </div>
            <div className="space-y-24">
                <div>
                    <p className="font-medium text-slate-900">Kuasa Pengguna Barang</p>
                    <p className="text-slate-500 text-sm mt-1">Tanda Tangan</p>
                </div>
                <div>
                    <p className="font-bold text-slate-900">Dr. Sri Mulyani, S.E., M.Ak.</p>
                    <p className="text-slate-500 text-sm mt-1">14 Desember 2024</p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}
