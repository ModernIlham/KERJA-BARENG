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
    <div className="w-full bg-white p-8 min-h-screen text-slate-900 print:p-0 font-serif">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-10 no-print">
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
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2 border-b-4 border-slate-900 inline-block pb-2">Laporan Barang Milik Negara</h1>
        <p className="text-base text-slate-600 mt-2 uppercase tracking-wide">Rekapitulasi nilai Barang Milik Negara per {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
      </div>

      {/* 1. Ringkasan Nilai Aset */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 uppercase whitespace-nowrap">Ringkasan Nilai Aset</h2>
            <div className="h-[2px] bg-slate-900 w-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Nilai Perolehan */}
          <div className="border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-lg font-bold text-slate-900 uppercase mb-4 border-b-2 border-slate-200 pb-2">Nilai Perolehan</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                  <span className="text-base font-semibold">Tanah</span>
                  <div className="text-right">
                    <div className="font-bold text-base">{formatCurrency(nilai_aset.Tanah?.nilai_perolehan)}</div>
                    <div className="text-xs text-slate-500">{nilai_aset.Tanah?.count || 0} bidang</div>
                  </div>
                </div>
                <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                  <span className="text-base font-semibold">Gedung & Bangunan</span>
                  <div className="text-right">
                    <div className="font-bold text-base">{formatCurrency(nilai_aset["Gedung & Bangunan"]?.nilai_perolehan)}</div>
                    <div className="text-xs text-slate-500">{nilai_aset["Gedung & Bangunan"]?.count || 0} unit</div>
                  </div>
                </div>
                <div className="flex justify-between items-end border-b border-dotted border-slate-300 pb-2">
                  <span className="text-base font-semibold">Peralatan & Mesin</span>
                  <div className="text-right">
                    <div className="font-bold text-base">{formatCurrency(nilai_aset["Peralatan & Mesin"]?.nilai_perolehan)}</div>
                    <div className="text-xs text-slate-500">{nilai_aset["Peralatan & Mesin"]?.count || 0} unit</div>
                  </div>
                </div>
                <div className="pt-2 mt-2 flex justify-between items-center font-bold bg-slate-100 p-2 border border-slate-200">
                  <span className="text-base uppercase">Total</span>
                  <span className="text-lg">{formatCurrency(totalPerolehan)}</span>
                </div>
              </div>
          </div>

          {/* Penyusutan */}
          <div className="border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-lg font-bold text-slate-900 uppercase mb-4 border-b-2 border-slate-200 pb-2">Penyusutan</h3>
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-bold text-slate-500 mb-1 uppercase">Akumulasi Penyusutan</div>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(penyusutan.total)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Metode</div>
                        <div className="text-base font-semibold border-b border-slate-300 pb-1">Garis Lurus</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Masa Manfaat</div>
                        <div className="text-base font-semibold border-b border-slate-300 pb-1">4-20 Tahun</div>
                    </div>
                </div>
              </div>
          </div>

          {/* Nilai Buku */}
          <div className="border-2 border-slate-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 uppercase mb-4 border-b-2 border-slate-200 pb-2">Nilai Buku</h3>
              <div className="flex flex-col justify-center h-full space-y-6">
                <div>
                    <div className="text-sm font-bold text-slate-500 mb-2 uppercase">Total Aset Tetap</div>
                    <div className="text-4xl font-extrabold text-blue-900">{formatCurrency(nilai_buku.total)}</div>
                </div>
                <div className="text-sm text-slate-600 italic bg-white p-3 border border-slate-200">
                    "Nilai Perolehan dikurangi Akumulasi Penyusutan"
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* 2. Kondisi Aset */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 uppercase whitespace-nowrap">Kondisi Aset</h2>
            <div className="h-[2px] bg-slate-900 w-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-slate-900 rounded-none p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase border-b border-slate-200 pb-2">Distribusi Kondisi</h3>
                <div className="space-y-6">
                    {/* Baik */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-600 border border-black"></div>
                                <span className="text-base font-bold uppercase">Baik</span>
                            </div>
                            <div className="text-base font-bold">{kondisi.Baik} unit <span className="text-slate-500 font-normal">({calculatePercent(kondisi.Baik)}%)</span></div>
                        </div>
                        <div className="w-full bg-slate-200 h-4 border border-black">
                            <div className="bg-green-600 h-full border-r border-black print:bg-green-600" style={{width: `${calculatePercent(kondisi.Baik)}%`}}></div>
                        </div>
                    </div>

                    {/* Rusak Ringan */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-400 border border-black"></div>
                                <span className="text-base font-bold uppercase">Rusak Ringan</span>
                            </div>
                            <div className="text-base font-bold">{kondisi['Rusak Ringan']} unit <span className="text-slate-500 font-normal">({calculatePercent(kondisi['Rusak Ringan'])}%)</span></div>
                        </div>
                        <div className="w-full bg-slate-200 h-4 border border-black">
                            <div className="bg-yellow-400 h-full border-r border-black print:bg-yellow-400" style={{width: `${calculatePercent(kondisi['Rusak Ringan'])}%`}}></div>
                        </div>
                    </div>

                    {/* Rusak Berat */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-600 border border-black"></div>
                                <span className="text-base font-bold uppercase">Rusak Berat</span>
                            </div>
                            <div className="text-base font-bold">{kondisi['Rusak Berat']} unit <span className="text-slate-500 font-normal">({calculatePercent(kondisi['Rusak Berat'])}%)</span></div>
                        </div>
                        <div className="w-full bg-slate-200 h-4 border border-black">
                            <div className="bg-red-600 h-full border-r border-black print:bg-red-600" style={{width: `${calculatePercent(kondisi['Rusak Berat'])}%`}}></div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-lg font-bold mt-4">
                        <span>TOTAL ASET</span>
                        <span>{kondisi.total} UNIT</span>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 border-2 border-slate-900 rounded-none p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase border-b border-slate-200 pb-2">Catatan Kondisi</h3>
                <ul className="space-y-6">
                    <li className="flex gap-4 items-start">
                        <div className="w-2 bg-green-600 self-stretch border border-black shadow-sm"></div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 uppercase">{calculatePercent(kondisi.Baik)}% Aset dalam Kondisi Baik</div>
                            <p className="text-slate-600 text-sm mt-1 font-sans">Aset dalam kondisi prima dan pemeliharaan rutin berjalan sesuai jadwal yang telah ditetapkan.</p>
                        </div>
                    </li>
                    <li className="flex gap-4 items-start">
                        <div className="w-2 bg-yellow-400 self-stretch border border-black shadow-sm"></div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 uppercase">{kondisi['Rusak Ringan']} Unit Perlu Perbaikan</div>
                            <p className="text-slate-600 text-sm mt-1 font-sans">Aset mengalami kerusakan minor. Diusulkan dalam anggaran pemeliharaan TA {new Date().getFullYear() + 1}.</p>
                        </div>
                    </li>
                    <li className="flex gap-4 items-start">
                        <div className="w-2 bg-red-600 self-stretch border border-black shadow-sm"></div>
                        <div>
                            <div className="text-lg font-bold text-slate-900 uppercase">{kondisi['Rusak Berat']} Unit Diusulkan Penghapusan</div>
                            <p className="text-slate-600 text-sm mt-1 font-sans">Aset tidak dapat digunakan. Proses penghapusan sedang disiapkan sesuai PMK 83/2016.</p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
      </section>

      {/* 3. Daftar Inventaris Barang */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 uppercase whitespace-nowrap">Daftar Inventaris Barang</h2>
            <div className="h-[2px] bg-slate-900 w-full"></div>
        </div>
        
        <div className="border-2 border-slate-900">
            <Table>
                <TableHeader className="bg-slate-100 border-b-2 border-slate-900">
                    <TableRow>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 h-12 uppercase">Kode Barang</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 uppercase">Nama/Jenis Barang</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 uppercase">Merk/Type</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-center uppercase">Tahun</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-center uppercase">Kondisi</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-right uppercase">Nilai Perolehan</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-right uppercase">Akum. Penyusutan</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 text-right uppercase">Nilai Sisa</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {kib.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-slate-300 hover:bg-slate-50">
                            <TableCell className="font-mono border-r border-slate-300 py-3 font-semibold">{item.kode_barang}</TableCell>
                            <TableCell className="font-medium border-r border-slate-300 py-3">{item.nama_barang}</TableCell>
                            <TableCell className="border-r border-slate-300 py-3 text-slate-600">{item.merk} {item.tipe}</TableCell>
                            <TableCell className="text-center border-r border-slate-300 py-3">{item.tahun_anggaran}</TableCell>
                            <TableCell className="text-center border-r border-slate-300 py-3">
                                <span className={`px-3 py-1 border font-bold text-xs uppercase ${
                                    item.kondisi === 'Baik' ? 'bg-green-100 text-green-800 border-green-300' :
                                    item.kondisi === 'Rusak Berat' ? 'bg-red-100 text-red-800 border-red-300' :
                                    'bg-yellow-100 text-yellow-800 border-yellow-300'
                                }`}>
                                    {item.kondisi}
                                </span>
                            </TableCell>
                            <TableCell className="text-right border-r border-slate-300 py-3">{formatCurrency(item.nilai_perolehan)}</TableCell>
                            <TableCell className="text-right text-slate-500 border-r border-slate-300 py-3">{formatCurrency(item.nilai_penyusutan)}</TableCell>
                            <TableCell className="text-right font-bold py-3 text-slate-900">{formatCurrency(item.nilai_buku)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-900">
                        <TableCell colSpan={7} className="text-right uppercase text-sm border-r border-slate-300 py-3">Total Nilai Sisa (Halaman Ini)</TableCell>
                        <TableCell className="text-right text-sm py-3 border-l-2 border-slate-900">
                            {formatCurrency(kib.reduce((sum, item) => sum + (item.nilai_buku || 0), 0))}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 4. Mutasi Barang */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 uppercase whitespace-nowrap">Mutasi Barang</h2>
            <div className="h-[2px] bg-slate-900 w-full"></div>
        </div>

        <div className="border-2 border-slate-900">
            <Table>
                <TableHeader className="bg-slate-100 border-b-2 border-slate-900">
                    <TableRow>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 h-12 uppercase">Jenis Mutasi</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-center uppercase">Masuk (Unit)</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 border-r border-slate-300 text-center uppercase">Keluar (Unit)</TableHead>
                        <TableHead className="text-sm font-bold text-slate-900 text-right uppercase">Nilai</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mutasi.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-sm text-slate-500 py-6 italic">Tidak ada mutasi tahun ini.</TableCell></TableRow>
                    ) : (
                        mutasi.map((m, idx) => (
                            <TableRow key={idx} className="border-b border-slate-300 hover:bg-slate-50">
                                <TableCell className="font-bold border-r border-slate-300 py-3 uppercase">
                                    {m._id === 'MASUK' ? 'Pengadaan Baru' : 
                                     m._id === 'KELUAR' ? 'Penghapusan / Transfer Keluar' : 
                                     m._id === 'in' ? 'Pengadaan Baru' :
                                     m._id === 'out' ? 'Penghapusan' : m._id}
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-300 py-3">
                                    {m._id === 'MASUK' || m._id === 'in' ? <span className="font-bold text-green-700">+{m.qty}</span> : '-'}
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-300 py-3">
                                    {m._id === 'KELUAR' || m._id === 'out' ? <span className="font-bold text-red-700">-{m.qty}</span> : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold py-3 text-slate-900">{formatCurrency(m.total_nilai)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </section>

      {/* 5. Dasar Hukum & Catatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        <div className="border-2 border-slate-900 p-6 bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="font-bold mb-4 uppercase text-slate-900 border-b-2 border-slate-300 pb-2">Dasar Hukum</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm font-medium text-slate-800">
                <li>UU No. 1 Tahun 2004 tentang Perbendaharaan Negara</li>
                <li>PP No. 27 Tahun 2014 tentang Pengelolaan BMN/D</li>
                <li>PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN</li>
            </ul>
        </div>
        <div className="border-2 border-slate-900 p-6 bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="font-bold mb-4 uppercase text-slate-900 border-b-2 border-slate-300 pb-2">Catatan</h4>
            <p className="leading-relaxed text-sm font-medium text-slate-800 text-justify font-sans">
                Laporan ini disusun berdasarkan data yang tercatat dalam Sistem Informasi Manajemen dan Akuntansi Barang Milik Negara (SIMAK-BMN) dan telah direkonsiliasi dengan Sistem Akuntansi Instansi (SAI) per tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
            </p>
        </div>
      </div>

      {/* 6. Lembar Pengesahan */}
      <section className="mt-16 break-inside-avoid">
        <div className="border-t-4 border-slate-900 pt-8">
            <h3 className="text-lg font-bold text-center mb-12 uppercase tracking-widest border-2 border-slate-900 inline-block px-8 py-2 mx-auto block w-fit">Lembar Pengesahan</h3>
            <div className="grid grid-cols-3 gap-8 text-center">
                <div className="space-y-24">
                    <div>
                        <p className="font-bold uppercase text-slate-900 text-sm">Operator SIMAK-BMN</p>
                        <p className="text-slate-500 text-xs italic mt-1 font-sans">Tanda Tangan</p>
                    </div>
                    <div>
                        <p className="font-bold underline uppercase text-slate-900 text-sm">Drs. Bambang Sutrisno, M.M.</p>
                        <p className="text-slate-700 text-xs mt-1 font-mono">NIP. 19700812 199503 1 002</p>
                    </div>
                </div>
                <div className="space-y-24">
                    <div>
                        <p className="font-bold uppercase text-slate-900 text-sm">Pengelola BMN</p>
                        <p className="text-slate-500 text-xs italic mt-1 font-sans">Tanda Tangan</p>
                    </div>
                    <div>
                        <p className="font-bold underline uppercase text-slate-900 text-sm">Ir. Widodo Prasetyo, M.T.</p>
                        <p className="text-slate-700 text-xs mt-1 font-mono">NIP. 19750520 200112 1 001</p>
                    </div>
                </div>
                <div className="space-y-24">
                    <div>
                        <p className="font-bold uppercase text-slate-900 text-sm">Kuasa Pengguna Barang</p>
                        <p className="text-slate-500 text-xs italic mt-1 font-sans">Tanda Tangan</p>
                    </div>
                    <div>
                        <p className="font-bold underline uppercase text-slate-900 text-sm">Dr. Sri Mulyani, S.E., M.Ak.</p>
                        <p className="text-slate-700 text-xs mt-1 font-mono">NIP. 19681110 199203 2 001</p>
                    </div>
                </div>
            </div>
            <div className="text-center mt-12 text-xs text-slate-400 font-mono">
                [ Dokumen ini dicetak secara otomatis oleh sistem pada: {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'})} ]
            </div>
        </div>
      </section>
    </div>
  );
}
