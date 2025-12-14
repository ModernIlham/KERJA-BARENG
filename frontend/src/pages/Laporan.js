import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, Printer, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export default function Laporan() {
  const [barangList, setBarangList] = useState([]);
  const [selectedBarang, setSelectedBarang] = useState('');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [mutasiReport, setMutasiReport] = useState(null);
  const [posisiReport, setPosisiReport] = useState(null);

  useEffect(() => {
    api.get('/api/barang').then(res => setBarangList(res.data));
  }, []);

  const generateKartu = async () => {
    if (!selectedBarang) return toast.error("Pilih barang!");
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
    }
  };

  const generateMutasi = async () => {
      if(!dateRange.start || !dateRange.end) return toast.error("Pilih rentang tanggal!");
      try {
          const res = await api.get('/api/laporan/mutasi', {
            params: { start_date: dateRange.start, end_date: dateRange.end }
          });
          setMutasiReport(res.data);
      } catch(e) { toast.error("Gagal load mutasi"); }
  };
  
  const generatePosisi = async () => {
      try {
          const res = await api.get('/api/laporan/posisi-stok');
          setPosisiReport(res.data);
      } catch(e) { toast.error("Gagal load posisi stok"); }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Laporan & Arsip</h1>
        
        <Tabs defaultValue="posisi" onValueChange={(val) => {
            if(val === 'posisi' && !posisiReport) generatePosisi();
        }}>
            <TabsList className="bg-slate-100">
                <TabsTrigger value="posisi">Posisi Persediaan</TabsTrigger>
                <TabsTrigger value="mutasi">Laporan Mutasi</TabsTrigger>
                <TabsTrigger value="kartu">Kartu Gudang</TabsTrigger>
            </TabsList>

            <TabsContent value="posisi" className="mt-4">
                 <Card>
                     <CardHeader className="flex flex-row justify-between">
                         <CardTitle>Laporan Posisi Persediaan (Current Stock)</CardTitle>
                         <Button size="sm" onClick={generatePosisi}><Search size={14} className="mr-2"/> Refresh</Button>
                     </CardHeader>
                     <CardContent>
                         <div className="max-h-[600px] overflow-y-auto">
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
                                    {posisiReport ? posisiReport.map((item, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-xs">{item.kode_barang}</TableCell>
                                            <TableCell className="font-medium">{item.nama_barang}</TableCell>
                                            <TableCell className="text-right font-bold">{item.stok}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.nilai_satuan)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(item.total_nilai)}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                         </div>
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
                            <Button onClick={generateMutasi} className="bg-slate-900">Proses Laporan</Button>
                         </div>
                     </CardHeader>
                     <CardContent>
                        {mutasiReport && (
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
                                            <TableCell className="text-right text-green-600">{m.mutasi_masuk}</TableCell>
                                            <TableCell className="text-right text-red-600">{m.mutasi_keluar}</TableCell>
                                            <TableCell className="text-right font-bold bg-slate-50">{m.saldo_akhir}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                     </CardContent>
                 </Card>
            </TabsContent>

            <TabsContent value="kartu" className="mt-4">
                 <Card className="no-print">
                    <CardHeader><CardTitle>Filter Kartu Gudang</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pilih Barang</label>
                                <select 
                                    className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                    value={selectedBarang}
                                    onChange={(e) => setSelectedBarang(e.target.value)}
                                >
                                    <option value="">-- Pilih --</option>
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
                                <Button onClick={generateKartu} className="bg-slate-900 flex-1">
                                    <Search className="mr-2 h-4 w-4"/> Tampilkan
                                </Button>
                                <Button variant="outline" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {reportData && (
                    <Card className="print-area mt-4">
                        <CardHeader className="text-center border-b pb-4">
                            <h2 className="text-xl font-bold uppercase">Kartu Persediaan Barang</h2>
                            <div className="text-sm text-slate-500 mt-1">
                                {reportData.barang.nama_barang} | Kode: {reportData.barang.kode_barang}
                            </div>
                            <div className="text-xs text-slate-400">
                                Periode: {reportData.periode.start || 'Awal'} s/d {reportData.periode.end || 'Kini'}
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
                                        <TableCell className="text-right">{reportData.saldo_awal}</TableCell>
                                    </TableRow>
                                    {reportData.mutasi.map((m, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{new Date(m.tanggal).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-mono text-xs">{m.no_dokumen}</TableCell>
                                            <TableCell className="text-xs">{m.keterangan}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">{m.masuk > 0 ? m.masuk : '-'}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">{m.keluar > 0 ? m.keluar : '-'}</TableCell>
                                            <TableCell className="text-right font-bold">{m.saldo}</TableCell>
                                        </TableRow>
                                    ))}
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
