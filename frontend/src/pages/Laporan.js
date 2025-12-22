import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, FileText, Download, RefreshCcw, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { Pagination } from '../components/ui/pagination';

import LaporanBMN from './LaporanBMN';

export default function Laporan() {
  const { type } = useParams();
  const navigate = useNavigate();
  const activeTab = type || 'bmn';

  const [barangList, setBarangList] = useState([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [mutasiReport, setMutasiReport] = useState(null);
  const [posisiReport, setPosisiReport] = useState([]);
  const [loadingPosisi, setLoadingPosisi] = useState(false);
  const [loadingMutasi, setLoadingMutasi] = useState(false);
  const [loadingKartu, setLoadingKartu] = useState(false);

  // Pagination for Posisi Stok
  const [posisiPage, setPosisiPage] = useState(1);
  const [posisiTotal, setPosisiTotal] = useState(0);
  const posisiLimit = 20;

  // Pagination for Mutasi
  const [mutasiPage, setMutasiPage] = useState(1);
  const [mutasiTotal, setMutasiTotal] = useState(0);
  const mutasiLimit = 20;

  useEffect(() => {
    api.get('/api/barang').then(res => setBarangList(res.data.data || []));
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
      if (activeTab === 'posisi') {
          generatePosisi(posisiPage);
      }
  }, [activeTab, posisiPage]);

  const generateKartu = async () => {
    if (!selectedBarang) return toast.error("Pilih barang!");
    setLoadingKartu(true);
    try {
        const res = await api.get('/api/laporan/kartu-gudang', {
            params: { 
                barang_id: selectedBarang,
                start_date: dateRange.start,
                end_date: dateRange.end
            }
        });
        setReportData(res.data);
    } catch (e) {
        console.error(e);
        toast.error('Gagal memuat data kartu gudang');
    } finally {
        setLoadingKartu(false);
    }
  };

  const generateMutasi = async (page = 1) => {
      if(!dateRange.start || !dateRange.end) return toast.error("Pilih rentang tanggal!");
      setLoadingMutasi(true);
      try {
          const res = await api.get('/api/laporan/mutasi', {
            params: { 
                start_date: dateRange.start, 
                end_date: dateRange.end,
                page,
                limit: mutasiLimit
            }
          });
          setMutasiReport(res.data.data || res.data);
          setMutasiTotal(res.data.total || res.data.length);
          setMutasiPage(page);
      } catch(e) { 
          toast.error("Gagal load mutasi"); 
      } finally {
          setLoadingMutasi(false);
      }
  };
  
  const generatePosisi = async (page = 1) => {
      setLoadingPosisi(true);
      try {
          const res = await api.get('/api/laporan/posisi-stok', {
              params: { page, limit: posisiLimit }
          });
          setPosisiReport(res.data.data || res.data);
          setPosisiTotal(res.data.total || res.data.length);
      } catch(e) { 
          toast.error("Gagal load posisi stok"); 
      } finally {
          setLoadingPosisi(false);
      }
  };

  const exportPosisiExcel = async () => {
      const t = toast.loading('Mengunduh Excel...');
      try {
          const res = await api.get('/api/laporan/posisi-stok/export', { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Posisi_Stok_${new Date().toISOString().split('T')[0]}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Download selesai', { id: t });
      } catch (e) {
          toast.error('Gagal export', { id: t });
      }
  };

  const exportKartuPDF = async () => {
      if (!reportData) return;
      const t = toast.loading('Generating PDF...');
      try {
          const res = await api.get('/api/laporan/kartu-gudang/pdf', {
              params: { 
                  barang_id: selectedBarang,
                  start_date: dateRange.start,
                  end_date: dateRange.end
              },
              responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `Kartu_Gudang_${reportData.barang.kode_barang}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('PDF selesai', { id: t });
      } catch (e) {
          toast.error('Gagal generate PDF', { id: t });
      }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 no-print">Laporan & Arsip</h1>
        
        <Tabs value={activeTab} className="no-print-tabs" onValueChange={(val) => navigate(`/laporan/${val}`)}>
            <TabsList className="bg-slate-100 no-print">
                <TabsTrigger value="bmn">Laporan Inti (BMN)</TabsTrigger>
                <TabsTrigger value="posisi">Posisi Persediaan</TabsTrigger>
                <TabsTrigger value="mutasi">Laporan Mutasi</TabsTrigger>
                <TabsTrigger value="kartu">Kartu Gudang</TabsTrigger>
            </TabsList>

            <TabsContent value="bmn" className="mt-4">
                <LaporanBMN />
            </TabsContent>

            <TabsContent value="posisi" className="mt-4">
                 <Card>
                     <CardHeader className="flex flex-row justify-between items-center">
                         <CardTitle>Laporan Posisi Persediaan (Current Stock)</CardTitle>
                         <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={() => generatePosisi(posisiPage)}>
                                 <RefreshCcw size={14} className={loadingPosisi ? 'animate-spin mr-2' : 'mr-2'}/> Refresh
                             </Button>
                             <Button size="sm" variant="outline" onClick={exportPosisiExcel}>
                                 <Download size={14} className="mr-2"/> Excel
                             </Button>
                         </div>
                     </CardHeader>
                     <CardContent>
                         {loadingPosisi ? (
                             <div className="py-12 flex justify-center">
                                 <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                             </div>
                         ) : (
                             <>
                                 <div className="max-h-[500px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kode Barang</TableHead>
                                                <TableHead>Nama Barang</TableHead>
                                                <TableHead className="text-right">Stok</TableHead>
                                                <TableHead className="text-right">Nilai Satuan</TableHead>
                                                <TableHead className="text-right">Total Nilai</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {posisiReport.length > 0 ? posisiReport.map((item, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-xs">{item.kode_barang}</TableCell>
                                                    <TableCell className="font-medium">{item.nama_barang}</TableCell>
                                                    <TableCell className="text-right font-bold">{item.stok}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.nilai_satuan)}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(item.total_nilai)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                                                        Tidak ada data persediaan
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                 </div>
                                 <Pagination 
                                     currentPage={posisiPage}
                                     totalPages={Math.ceil(posisiTotal / posisiLimit)}
                                     totalItems={posisiTotal}
                                     limit={posisiLimit}
                                     onPageChange={(p) => { setPosisiPage(p); generatePosisi(p); }}
                                 />
                             </>
                         )}
                     </CardContent>
                 </Card>
            </TabsContent>

            <TabsContent value="mutasi" className="mt-4">
                 <Card>
                     <CardHeader>
                         <CardTitle>Laporan Mutasi Barang</CardTitle>
                         <div className="flex gap-4 items-end mt-4">
                            <div className="space-y-1">
                                <label className="text-xs">Dari Tanggal</label>
                                <Input type="date" onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs">Sampai Tanggal</label>
                                <Input type="date" onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                            </div>
                            <Button onClick={() => generateMutasi(1)} className="bg-slate-900" disabled={loadingMutasi}>
                                {loadingMutasi ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Proses Laporan
                            </Button>
                         </div>
                     </CardHeader>
                     <CardContent>
                        {mutasiReport && mutasiReport.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Barang</TableHead>
                                            <TableHead className="text-right">Saldo Awal</TableHead>
                                            <TableHead className="text-right">Masuk</TableHead>
                                            <TableHead className="text-right">Keluar</TableHead>
                                            <TableHead className="text-right">Saldo Akhir</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mutasiReport.map((m, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div className="font-medium">{m.nama_barang}</div>
                                                    <div className="text-xs text-slate-500">{m.kode_barang}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{m.saldo_awal}</TableCell>
                                                <TableCell className="text-right text-green-600">+{m.mutasi_masuk}</TableCell>
                                                <TableCell className="text-right text-red-600">-{m.mutasi_keluar}</TableCell>
                                                <TableCell className="text-right font-bold bg-slate-50">{m.saldo_akhir}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Pagination 
                                    currentPage={mutasiPage}
                                    totalPages={Math.ceil(mutasiTotal / mutasiLimit)}
                                    totalItems={mutasiTotal}
                                    limit={mutasiLimit}
                                    onPageChange={(p) => generateMutasi(p)}
                                />
                            </>
                        ) : (
                            <div className="py-12 text-center text-slate-400">
                                Pilih rentang tanggal dan klik "Proses Laporan"
                            </div>
                        )}
                     </CardContent>
                 </Card>
            </TabsContent>

            <TabsContent value="kartu" className="mt-4">
                 <Card className="no-print">
                    <CardHeader><CardTitle>Filter Kartu Gudang Persediaan</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Pilih Barang</label>
                                <select 
                                    className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                    value={selectedBarang}
                                    onChange={(e) => setSelectedBarang(e.target.value)}
                                >
                                    <option value="">-- Pilih Barang --</option>
                                    {barangList.map(b => (
                                        <option key={b._id} value={b._id}>{b.nama_barang}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Dari Tanggal</label>
                                <Input type="date" onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sampai Tanggal</label>
                                <Input type="date" onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={generateKartu} className="bg-slate-900 flex-1" disabled={loadingKartu}>
                                    {loadingKartu ? <Loader2 size={14} className="animate-spin mr-2" /> : <Search className="mr-2 h-4 w-4"/>}
                                    Tampilkan
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {reportData && (
                    <Card className="print-area mt-4">
                        <CardHeader className="text-center border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div></div>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold uppercase">Kartu Persediaan Barang</h2>
                                    <div className="text-sm text-slate-500 mt-1">
                                        {reportData.barang.nama_barang} | Kode: {reportData.barang.kode_barang}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Periode: {reportData.periode.start || 'Awal'} s/d {reportData.periode.end || 'Kini'}
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={exportKartuPDF}>
                                    <FileText className="h-4 w-4 mr-1"/> PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>No. Dokumen</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                        <TableHead className="text-right">Masuk</TableHead>
                                        <TableHead className="text-right">Keluar</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-slate-50 font-medium">
                                        <TableCell colSpan={5}>Saldo Awal</TableCell>
                                        <TableCell className="text-right font-bold">{reportData.saldo_awal}</TableCell>
                                    </TableRow>
                                    {reportData.mutasi.map((m, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{new Date(m.tanggal).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell className="font-mono text-xs">{m.no_dokumen}</TableCell>
                                            <TableCell className="text-xs">{m.keterangan}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">{m.masuk > 0 ? `+${m.masuk}` : '-'}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">{m.keluar > 0 ? `-${m.keluar}` : '-'}</TableCell>
                                            <TableCell className="text-right font-bold">{m.saldo}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-blue-50 font-bold">
                                        <TableCell colSpan={5}>Saldo Akhir</TableCell>
                                        <TableCell className="text-right text-blue-700 text-lg">
                                            {reportData.mutasi.length > 0 
                                                ? reportData.mutasi[reportData.mutasi.length - 1].saldo 
                                                : reportData.saldo_awal}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}
